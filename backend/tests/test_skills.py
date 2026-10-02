"""Skill extraction and normalisation tests."""

from pathlib import Path

import pytest

from app.ai.skill_extractor import (
    extract_skills,
    extract_skills_from_sections,
    normalise_skill_names,
)
from app.ai.taxonomy import get_taxonomy, slugify


def names(text: str, section: str | None = None) -> set[str]:
    return {item.name for item in extract_skills(text, section)}


# ---------------------------------------------------------------------------
# Taxonomy integrity
# ---------------------------------------------------------------------------
def test_taxonomy_loads_and_is_large_enough() -> None:
    taxonomy = get_taxonomy()
    assert len(taxonomy.skills) >= 100
    assert len(taxonomy.categories) >= 10


def test_every_prerequisite_exists_in_the_taxonomy() -> None:
    """Prerequisites are authored with real capitalisation, so resolution must
    be case-insensitive or the roadmap silently loses every dependency."""
    taxonomy = get_taxonomy()
    for skill in taxonomy.skills:
        for name in skill.prerequisites:
            assert taxonomy.by_canonical_name(name) is not None, (
                f"{skill.name} -> {name}"
            )


def test_prerequisites_actually_resolve() -> None:
    """Regression guard: a capitalised prerequisite must resolve."""
    taxonomy = get_taxonomy()
    java = taxonomy.by_canonical_name("Java")
    assert java is not None

    prerequisites = [entry.name for entry in taxonomy.prerequisite_skills(java)]
    assert "Object-Oriented Programming" in prerequisites

    assert taxonomy.prerequisite_chain("typescript") == ["JavaScript"]


def test_topological_order_places_prerequisites_first() -> None:
    taxonomy = get_taxonomy()
    ordered = taxonomy.topologically_ordered({"docker", "linux", "kubernetes"})
    slugs = [skill.slug for skill in ordered]
    assert slugs.index("linux") < slugs.index("docker")
    assert slugs.index("docker") < slugs.index("kubernetes")


def test_slugify_keeps_technical_skills_distinct() -> None:
    assert slugify("C") == "c"
    assert slugify("C++") == "c-plus-plus"
    assert slugify("C#") == "c-sharp"
    assert slugify("Node.js") == "node-js"
    assert slugify("CI/CD") == "ci-cd"
    assert slugify("REST APIs") == "rest-apis"


# ---------------------------------------------------------------------------
# Alias resolution
# ---------------------------------------------------------------------------
@pytest.mark.parametrize(
    ("alias", "expected"),
    [
        ("JS", "JavaScript"),
        ("TS", "TypeScript"),
        ("ReactJS", "React"),
        ("Postgres", "PostgreSQL"),
        ("Mongo", "MongoDB"),
        ("Node", "Node.js"),
        ("k8s", "Kubernetes"),
        ("sklearn", "scikit-learn"),
    ],
)
def test_aliases_resolve_to_canonical_names(alias: str, expected: str) -> None:
    found = names(f"Skills: {alias}")
    assert expected in found, f"{alias!r} should resolve to {expected!r}, got {found}"


def test_normalise_skill_names_drops_unknown_values() -> None:
    resolved = normalise_skill_names(["Python", "TotallyNotASkill", "Docker"])
    assert [skill.name for skill in resolved] == ["Python", "Docker"]


# ---------------------------------------------------------------------------
# Extraction accuracy
# ---------------------------------------------------------------------------
def test_extracts_multiple_skills_from_a_skill_list() -> None:
    found = names("Skills: Python, React, SQL, Git, Docker", "skills")
    assert {"Python", "React", "SQL", "Git", "Docker"} <= found


def test_does_not_confuse_java_with_javascript() -> None:
    """Longest-phrase-first matching must stop 'Java' matching inside 'JavaScript'."""
    found = names("Skills: JavaScript only")
    assert "JavaScript" in found
    assert "Java" not in found

    found_java = names("Skills: Java")
    assert "Java" in found_java
    assert "JavaScript" not in found_java


def test_skills_section_confidence_exceeds_incidental_mention() -> None:
    listed = {item.name: item for item in extract_skills("Skills: Python", "skills")}
    incidental = {item.name: item for item in extract_skills("I once saw Python", "projects")}

    assert listed["Python"].confidence > incidental["Python"].confidence


def test_empty_input_returns_nothing() -> None:
    assert extract_skills(None) == []
    assert extract_skills("") == []
    assert extract_skills("   \n  ") == []


def test_text_with_no_skills_returns_nothing() -> None:
    assert names("I enjoy hiking and painting on weekends.") == set()


def test_punctuated_skills_are_extracted() -> None:
    found = names("Skills: C, C++, C#, Node.js, CI/CD")
    assert {"C", "C++", "C#", "Node.js", "CI/CD"} <= found


def test_multiword_skill_variants_are_matched() -> None:
    assert "REST APIs" in names("Experience with REST API development")
    assert "Machine Learning" in names("Worked on machine-learning models")
    assert "Tailwind CSS" in names("Styled with TailwindCSS")


def test_extraction_is_deduplicated() -> None:
    found = [item.name for item in extract_skills("Python and more Python and Python again")]
    assert found.count("Python") == 1


def test_extract_from_sections_merges_and_prefers_stronger_evidence() -> None:
    sections = {
        "skills": ["Python, Docker"],
        "experience": ["Built services with Python and Kubernetes"],
    }
    results = {item.name: item for item in extract_skills_from_sections(sections, "Python Docker Kubernetes")}

    assert {"Python", "Docker", "Kubernetes"} <= set(results)
    # The explicit skills section gives the higher confidence.
    assert results["Python"].confidence >= results["Kubernetes"].confidence


def test_occurrences_are_counted() -> None:
    results = {item.name: item for item in extract_skills("Docker. Docker. Docker everywhere.")}
    assert results["Docker"].occurrences >= 3


# ---------------------------------------------------------------------------
# Resume parsing
# ---------------------------------------------------------------------------
FIXTURE_DIR = Path(__file__).resolve().parent / "fixtures"


def _fixture(name: str) -> bytes:
    path = FIXTURE_DIR / name
    if not path.is_file():
        pytest.skip(f"fixture {name} missing - run tests/fixtures/make_fixtures.py")
    return path.read_bytes()


def test_parses_pdf_resume_sections_and_contact() -> None:
    from app.ai.resume_parser import parse_resume

    parsed = parse_resume(_fixture("resume_rich.pdf"), "resume_rich.pdf")

    assert parsed.email == "alex.sharma@example.com"
    assert parsed.name is not None and "ALEX" in parsed.name.upper()
    assert {"skills", "education", "experience", "projects"} <= set(parsed.sections)
    assert parsed.word_count > 100


def test_parses_docx_resume() -> None:
    from app.ai.resume_parser import parse_resume

    parsed = parse_resume(_fixture("resume_rich.docx"), "resume_rich.docx")
    assert "skills" in parsed.sections
    assert parsed.email == "alex.sharma@example.com"


def test_docx_skills_table_lands_in_the_skills_section() -> None:
    """Table content must keep its document position, not move to the end."""
    from app.ai.resume_parser import parse_resume

    parsed = parse_resume(_fixture("resume_table.docx"), "resume_table.docx")
    skills_lines = " ".join(parsed.sections.get("skills", []))
    assert "Languages" in skills_lines
    assert "Kubernetes" in skills_lines


def test_sparse_resume_still_parses_without_crashing() -> None:
    from app.ai.resume_parser import parse_resume

    parsed = parse_resume(_fixture("resume_sparse.docx"), "resume_sparse.docx")
    assert parsed.text
    # No explicit skills section, so a warning should guide the student.
    assert any("Skills" in warning for warning in parsed.warnings)


def test_unsupported_extension_is_rejected() -> None:
    from app.ai.resume_parser import ResumeParseError, extract_text

    with pytest.raises(ResumeParseError):
        extract_text(b"data", "resume.txt")


def test_corrupt_pdf_is_rejected_cleanly() -> None:
    from app.ai.resume_parser import ResumeParseError, extract_text

    with pytest.raises(ResumeParseError):
        extract_text(b"this is definitely not a pdf", "broken.pdf")


def test_empty_pdf_is_rejected_cleanly() -> None:
    """A valid-but-empty document must raise a helpful error, not crash."""
    import pymupdf

    document = pymupdf.open()
    document.new_page()
    payload = document.tobytes()
    document.close()

    from app.ai.resume_parser import ResumeParseError, parse_resume

    with pytest.raises(ResumeParseError):
        parse_resume(payload, "empty.pdf")
