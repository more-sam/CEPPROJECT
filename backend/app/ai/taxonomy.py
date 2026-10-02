"""Loads the controlled skill taxonomy and exposes fast lookup indexes.

The taxonomy is stored as data (`data/skills/skill_taxonomy.json`) rather than
code, so it can be extended without touching any extraction logic.
"""

import json
import re
import unicodedata
from dataclasses import dataclass
from functools import lru_cache

from app.core.config import settings


# Symbols that carry meaning in a skill name must survive slugification. Without
# this, "C", "C++" and "C#" all collapse to the slug "c" and silently merge into
# a single skill. These replacements run before the generic punctuation strip.
_SYMBOL_WORDS: tuple[tuple[str, str], ...] = (
    ("++", " plus plus "),
    ("#", " sharp "),
    (".", " "),
    ("/", " "),
)


def slugify(value: str) -> str:
    """Return a stable, unique key for a skill name.

    Technical punctuation is expanded to words so that C, C++, C#, Node.js,
    Next.js and CI/CD all produce distinct slugs.
    """
    expanded = value
    for symbol, replacement in _SYMBOL_WORDS:
        expanded = expanded.replace(symbol, replacement)

    normalised = unicodedata.normalize("NFKD", expanded)
    ascii_only = normalised.encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "-", ascii_only.lower()).strip("-")


@dataclass(frozen=True)
class TaxonomySkill:
    """One canonical skill from the taxonomy."""

    name: str
    slug: str
    category: str
    description: str
    aliases: tuple[str, ...]
    related: tuple[str, ...]
    prerequisites: tuple[str, ...]
    estimated_hours: int
    resources: tuple[dict, ...]


@dataclass(frozen=True)
class SkillPattern:
    """A searchable phrase bound to the skill it represents."""

    pattern: re.Pattern[str]
    skill: TaxonomySkill
    phrase: str
    is_alias: bool


def _phrase_to_regex(phrase: str) -> re.Pattern[str]:
    """Compile a phrase into a boundary-aware regex.

    Word boundaries (\\b) are unusable here because skills legitimately contain
    punctuation ("C++", "C#", "Node.js", "CI/CD"). Lookarounds on alphanumerics
    give the same effect while supporting those names. Runs of spaces, hyphens or
    underscores are treated as equivalent so "node js" matches "Node.js".
    """
    escaped = re.escape(phrase)
    flexible = escaped.replace(r"\ ", r"[\s\-_]+")
    return re.compile(
        rf"(?<![A-Za-z0-9]){flexible}(?![A-Za-z0-9])",
        re.IGNORECASE,
    )


def normalise_text(value: str) -> str:
    """Collapse whitespace and normalise unicode so matching is stable."""
    without_control = "".join(
        char if char.isprintable() or char in "\n\t" else " " for char in value
    )
    return re.sub(r"[ \t\u00a0]+", " ", without_control).strip()


class Taxonomy:
    """In-memory index over every skill in the taxonomy."""

    def __init__(self, payload: dict) -> None:
        version = payload.get("version", "0")
        self.categories: tuple[str, ...] = tuple(payload.get("categories", ()))

        skills: list[TaxonomySkill] = []
        for entry in payload["skills"]:
            skills.append(
                TaxonomySkill(
                    name=entry["name"],
                    slug=slugify(entry["name"]),
                    category=entry["category"],
                    description=entry.get("description", ""),
                    aliases=tuple(entry.get("aliases", ())),
                    related=tuple(entry.get("related", ())),
                    prerequisites=tuple(entry.get("prerequisites", ())),
                    estimated_hours=int(entry.get("estimated_hours", 8)),
                    resources=tuple(entry.get("resources", ())),
                )
            )

        self.skills: tuple[TaxonomySkill, ...] = tuple(skills)
        self.by_slug: dict[str, TaxonomySkill] = {s.slug: s for s in skills}
        self.by_name: dict[str, TaxonomySkill] = {s.name.lower(): s for s in skills}
        self.version = version

        # Every searchable phrase -> skill. Aliases never override a canonical
        # name, so "React" always wins over an alias like "reactjs".
        phrase_owner: dict[str, tuple[TaxonomySkill, bool]] = {}
        for skill in skills:
            phrase_owner.setdefault(skill.name.lower(), (skill, False))
        for skill in skills:
            for alias in skill.aliases:
                key = alias.lower()
                if key in self.by_name:
                    continue  # it is already a canonical skill name
                phrase_owner.setdefault(key, (skill, True))

        # Longest phrases first: "C++" must be claimed before "C", and
        # "JavaScript" before "Java". Overlapping spans are discarded later.
        ordered = sorted(phrase_owner.items(), key=lambda item: len(item[0]), reverse=True)
        self.patterns: tuple[SkillPattern, ...] = tuple(
            SkillPattern(
                pattern=_phrase_to_regex(phrase),
                skill=skill,
                phrase=phrase,
                is_alias=is_alias,
            )
            for phrase, (skill, is_alias) in ordered
        )

        # General lookup index used by `find()` - includes multi-word names.
        self.single_word_index: dict[str, TaxonomySkill] = {}
        for skill in skills:
            self.single_word_index.setdefault(skill.name.lower(), skill)
        for skill in skills:
            for alias in skill.aliases:
                self.single_word_index.setdefault(alias.lower(), skill)

        # Terms that are exactly one word. Only these may be lemmatised into the
        # lemma index: lemmatising a phrase token-by-token would map its bare
        # component words onto the phrase ("api design" -> "api", "design"),
        # producing false positives such as an "API" mention matching
        # "API Design".
        self.single_word_terms: dict[str, TaxonomySkill] = {
            term: skill
            for term, skill in self.single_word_index.items()
            if " " not in term and "-" not in term and "/" not in term
        }

    def find(self, raw_name: str) -> TaxonomySkill | None:
        """Resolve any spelling of a skill to its canonical entry."""
        if not raw_name:
            return None
        key = normalise_text(raw_name).lower()
        if key in self.by_name:
            return self.by_name[key]
        return self.single_word_index.get(key)

    def by_canonical_name(self, name: str) -> TaxonomySkill | None:
        """Case-insensitive lookup by canonical name.

        `by_name` is keyed on lower-cased names (so 'react' and 'React' resolve
        once), but prerequisites are authored with their real capitalisation.
        Comparing a prerequisite against `by_name` directly therefore never
        matched, which silently emptied every roadmap item's prerequisite list.
        Always go through this method or `prerequisite_skills`.
        """
        if not name:
            return None
        return self.by_name.get(name.strip().lower())

    def prerequisite_skills(self, skill: TaxonomySkill) -> list[TaxonomySkill]:
        """Resolve a skill's prerequisites to taxonomy entries, dropping unknowns."""
        resolved: list[TaxonomySkill] = []
        for name in skill.prerequisites:
            found = self.by_canonical_name(name)
            if found is not None and found.slug != skill.slug:
                resolved.append(found)
        return resolved

    def prerequisite_chain(self, slug: str) -> list[str]:
        """Canonical names of the prerequisites for a skill, if any are known."""
        skill = self.by_slug.get(slug)
        if skill is None:
            return []
        return [entry.name for entry in self.prerequisite_skills(skill)]

    def topologically_ordered(self, slugs: set[str]) -> list[TaxonomySkill]:
        """Order a set of skills so prerequisites come before dependants.

        Only prerequisites inside the given set influence the order; external
        ones are assumed already satisfied. Cycles can never be introduced by a
        hand-authored taxonomy, but the visited guard makes that safe anyway.
        """
        by_slug = {slug: self.by_slug[slug] for slug in slugs if slug in self.by_slug}
        ordered: list[TaxonomySkill] = []
        placed: set[str] = set()
        visiting: set[str] = set()

        def visit(slug: str) -> None:
            if slug in placed or slug in visiting or slug not in by_slug:
                return
            visiting.add(slug)
            for prerequisite in self.prerequisite_skills(by_slug[slug]):
                visit(prerequisite.slug)
            visiting.discard(slug)
            placed.add(slug)
            ordered.append(by_slug[slug])

        # Visit in a deterministic order so identical inputs give identical output.
        for slug in sorted(by_slug):
            visit(slug)
        return ordered


@lru_cache
def get_taxonomy() -> Taxonomy:
    """Load and cache the taxonomy from disk (read once per process)."""
    path = settings.data_path("skills", "skill_taxonomy.json")
    with path.open(encoding="utf-8") as handle:
        payload = json.load(handle)
    return Taxonomy(payload)
