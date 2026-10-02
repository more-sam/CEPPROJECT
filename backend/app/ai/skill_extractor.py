"""Extract canonical skills from free text (resumes and job descriptions).

Two independent passes run and are merged:

1. **Phrase pass** - regex matching over the normalised text. Handles multi-word
   and punctuated skills ("REST APIs", "Node.js", "CI/CD") and is the reliable
   baseline.
2. **Lemma pass** - a spaCy lemmatised token stream. This catches inflected forms
   the alias list does not enumerate, e.g. "containers" matching Docker's
   "container" alias, or "indexes" matching "index". Matches found only this way
   are given slightly lower confidence because they are inferred, not literal.

spaCy is optional: if the model is missing the extractor still works using the
phrase pass alone.
"""

from dataclasses import dataclass
from functools import lru_cache

from app.ai.taxonomy import Taxonomy, TaxonomySkill, get_taxonomy, normalise_text

# Confidence ceilings per evidence type. These express how strong the evidence
# is, NOT how skilled the student is.
CONFIDENCE_CANONICAL_IN_SKILLS_SECTION = 0.95
CONFIDENCE_ALIAS_IN_SKILLS_SECTION = 0.85
CONFIDENCE_CANONICAL_IN_TEXT = 0.80
CONFIDENCE_ALIAS_IN_TEXT = 0.70
CONFIDENCE_LEMMA_INFERRED = 0.55

# Section names that count as "the student listed this explicitly".
EXPLICIT_SECTIONS = {"skills", "technical skills", "technologies", "certifications"}


@dataclass
class ExtractedSkill:
    """One skill found in a piece of text, with the evidence that produced it."""

    name: str
    slug: str
    category: str
    confidence: float
    occurrences: int
    evidence: str
    matched_phrases: list[str]


@lru_cache
def _get_nlp():
    """Load the spaCy English pipeline once. Returns None when unavailable."""
    try:
        import spacy  # imported lazily so the app runs without it
    except ImportError:
        return None
    try:
        return spacy.load("en_core_web_sm", disable=["ner", "parser"])
    except OSError:
        # Model not downloaded - fall back to the pure-regex path.
        return None


@lru_cache
def _get_lemma_index() -> dict[str, TaxonomySkill]:
    """Map single-token lemmas back to their skill.

    Only genuinely single-word terms are indexed. A multi-word skill such as
    "API Design" is deliberately excluded: lemmatising it token-by-token would
    map the bare word "api" onto it, so any mention of "API" would falsely
    report "API Design". Multi-word skills are handled by the phrase pass.
    """
    nlp = _get_nlp()
    if nlp is None:
        return {}

    taxonomy = get_taxonomy()
    index: dict[str, TaxonomySkill] = {}
    for word, skill in taxonomy.single_word_terms.items():
        if word.isdigit() or len(word) < 2:
            continue
        index.setdefault(word, skill)
        # Also index the lemma so inflections resolve ("containers" -> "container").
        for token in nlp(word):
            if token.is_alpha:
                index.setdefault(token.lemma_.lower(), skill)
    return index


def _section_weight(section_hint: str | None) -> tuple[float, float]:
    """Return (canonical_confidence, alias_confidence) for a section."""
    if section_hint and section_hint.strip().lower() in EXPLICIT_SECTIONS:
        return (
            CONFIDENCE_CANONICAL_IN_SKILLS_SECTION,
            CONFIDENCE_ALIAS_IN_SKILLS_SECTION,
        )
    return CONFIDENCE_CANONICAL_IN_TEXT, CONFIDENCE_ALIAS_IN_TEXT


def _phrase_pass(
    text: str,
    taxonomy: Taxonomy,
    canonical_confidence: float,
    alias_confidence: float,
) -> dict[str, ExtractedSkill]:
    """Regex matching with longest-phrase-first span claiming."""
    found: dict[str, ExtractedSkill] = {}
    claimed: list[tuple[int, int]] = []

    def overlaps(start: int, end: int) -> bool:
        return any(start < c_end and end > c_start for c_start, c_end in claimed)

    for entry in taxonomy.patterns:
        for match in entry.pattern.finditer(text):
            start, end = match.span()
            if overlaps(start, end):
                continue
            claimed.append((start, end))

            confidence = alias_confidence if entry.is_alias else canonical_confidence
            existing = found.get(entry.skill.slug)
            if existing is None:
                found[entry.skill.slug] = ExtractedSkill(
                    name=entry.skill.name,
                    slug=entry.skill.slug,
                    category=entry.skill.category,
                    confidence=confidence,
                    occurrences=1,
                    evidence="alias" if entry.is_alias else "exact",
                    matched_phrases=[match.group(0)],
                )
            else:
                existing.occurrences += 1
                # A canonical-name hit anywhere is stronger than an alias hit.
                existing.confidence = max(existing.confidence, confidence)
                if entry.is_alias is False:
                    existing.evidence = "exact"
                if match.group(0) not in existing.matched_phrases:
                    existing.matched_phrases.append(match.group(0))

    return found


def _lemma_pass(text: str, found: dict[str, ExtractedSkill]) -> None:
    """Merge spaCy lemmatised matches into the result (in place).

    Only skills not already found are added, and only when the lemma is a real
    single-word skill term. This keeps precision high while improving recall.
    """
    nlp = _get_nlp()
    lemma_index = _get_lemma_index()
    if nlp is None or not lemma_index:
        return

    lemma_counts: dict[str, int] = {}
    for token in nlp(text[:200_000]):
        if not token.is_alpha:
            continue
        skill = lemma_index.get(token.lemma_.lower())
        if skill is not None:
            lemma_counts[skill.slug] = lemma_counts.get(skill.slug, 0) + 1

    by_slug = get_taxonomy().by_slug
    for slug, count in lemma_counts.items():
        existing = found.get(slug)
        if existing is not None:
            existing.occurrences += count
            continue
        skill = by_slug.get(slug)
        if skill is None:
            continue
        found[slug] = ExtractedSkill(
            name=skill.name,
            slug=skill.slug,
            category=skill.category,
            confidence=CONFIDENCE_LEMMA_INFERRED,
            occurrences=count,
            evidence="lemma",
            matched_phrases=[],
        )


def extract_skills(
    text: str | None,
    section_hint: str | None = None,
) -> list[ExtractedSkill]:
    """Extract canonical skills from arbitrary text.

    Returns results ordered by confidence then name, so callers get a stable,
    most-reliable-first list.
    """
    if not text or not text.strip():
        return []

    taxonomy = get_taxonomy()
    cleaned = normalise_text(text)
    canonical_confidence, alias_confidence = _section_weight(section_hint)

    found = _phrase_pass(cleaned, taxonomy, canonical_confidence, alias_confidence)

    # The lemma pass is only worth its cost when spaCy is actually installed.
    if _get_nlp() is not None:
        _lemma_pass(cleaned, found)

    results = list(found.values())
    results.sort(key=lambda item: (-item.confidence, item.name))
    return results


def extract_skills_from_sections(
    sections: dict[str, list[str]],
    full_text: str,
) -> list[ExtractedSkill]:
    """Extract skills using resume section context to weight confidence.

    Skills listed under an explicit "Skills" heading are treated as
    self-declared and therefore high confidence. Everything else comes from the
    full text at a lower confidence.
    """
    merged: dict[str, ExtractedSkill] = {}

    for section_name, lines in sections.items():
        if not lines:
            continue
        section_text = "\n".join(lines)
        for item in extract_skills(section_text, section_hint=section_name):
            existing = merged.get(item.slug)
            if existing is None:
                merged[item.slug] = item
            else:
                existing.occurrences += item.occurrences
                existing.confidence = max(existing.confidence, item.confidence)

    # Anything mentioned anywhere in the resume also counts.
    for item in extract_skills(full_text, section_hint=None):
        existing = merged.get(item.slug)
        if existing is None:
            merged[item.slug] = item
        else:
            existing.occurrences += item.occurrences
            existing.confidence = max(existing.confidence, item.confidence)
            for phrase in item.matched_phrases:
                if phrase not in existing.matched_phrases:
                    existing.matched_phrases.append(phrase)

    results = list(merged.values())
    results.sort(key=lambda item: (-item.confidence, item.name))
    return results


def normalise_skill_names(raw_names: list[str]) -> list[TaxonomySkill]:
    """Resolve raw strings to canonical taxonomy skills, dropping unknowns."""
    taxonomy = get_taxonomy()
    resolved: list[TaxonomySkill] = []
    seen: set[str] = set()
    for raw in raw_names:
        skill = taxonomy.find(raw)
        if skill is not None and skill.slug not in seen:
            seen.add(skill.slug)
            resolved.append(skill)
    return resolved
