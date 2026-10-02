"""Matching engine tests.

The first two cases are the exact examples from the project brief and must keep
producing those values.
"""

import pytest

from app.services.matching_service import (
    SkillRequirement,
    compute_match,
)


def req(slug: str, name: str, importance: str = "medium") -> SkillRequirement:
    return SkillRequirement(slug=slug, name=name, importance=importance)


# ---------------------------------------------------------------------------
# Brief section 36: Student Python/React/SQL vs Job Python/React/Docker
#   Expected matched = Python, React
#            missing = Docker
#            compatibility = 66.67%
# ---------------------------------------------------------------------------
def test_brief_example_compatibility_is_66_67() -> None:
    result = compute_match(
        {"python", "react", "sql"},
        [req("python", "Python"), req("react", "React"), req("docker", "Docker")],
        enable_semantic=False,
    )

    assert result.matched_skills == ["Python", "React"]
    assert result.missing_skills == ["Docker"]
    assert result.compatibility_score == 66.67
    assert result.total_required == 3


# ---------------------------------------------------------------------------
# Brief section 2: Student Python/React/SQL/Git vs a 5-skill job -> 40%
# ---------------------------------------------------------------------------
def test_brief_example_compatibility_is_40() -> None:
    result = compute_match(
        {"python", "react", "sql", "git"},
        [
            req("python", "Python"),
            req("react", "React"),
            req("node-js", "Node.js"),
            req("mongodb", "MongoDB"),
            req("docker", "Docker"),
        ],
        enable_semantic=False,
    )

    assert result.matched_skills == ["Python", "React"]
    assert result.missing_skills == ["Node.js", "MongoDB", "Docker"]
    assert result.compatibility_score == 40.0


# ---------------------------------------------------------------------------
# Core properties
# ---------------------------------------------------------------------------
def test_perfect_match_scores_100() -> None:
    result = compute_match({"python", "react"}, [req("python", "Python"), req("react", "React")])
    assert result.compatibility_score == 100.0
    assert result.missing_skills == []


def test_no_match_scores_zero() -> None:
    result = compute_match({"rust"}, [req("python", "Python")], enable_semantic=False)
    assert result.compatibility_score == 0.0
    assert result.matched_skills == []


def test_job_with_no_requirements_scores_zero_not_a_guess() -> None:
    """An unscorable job must report 0, never an invented number."""
    result = compute_match({"python"}, [], enable_semantic=False)
    assert result.compatibility_score == 0.0
    assert result.is_empty is True


def test_student_with_no_skills_matches_nothing() -> None:
    result = compute_match(set(), [req("python", "Python")], enable_semantic=False)
    assert result.compatibility_score == 0.0
    assert result.missing_skills == ["Python"]


def test_compatibility_is_proportional_and_bounded() -> None:
    """Every prefix length k must give exactly k/n."""
    student_pool = ["python", "react", "sql", "docker", "git"]
    requirements = [req(slug, slug.title()) for slug in student_pool]

    for k in range(len(student_pool) + 1):
        result = compute_match(set(student_pool[:k]), requirements, enable_semantic=False)
        assert result.compatibility_score == pytest.approx(round(k / 5 * 100, 2))


# ---------------------------------------------------------------------------
# Additional skills must never reduce the score
# ---------------------------------------------------------------------------
def test_extra_student_skills_do_not_change_compatibility() -> None:
    requirements = [req("python", "Python"), req("react", "React"), req("docker", "Docker")]
    minimal = compute_match({"python", "react"}, requirements, enable_semantic=False)
    broadened = compute_match(
        {"python", "react", "sql", "git", "java", "css"}, requirements, enable_semantic=False
    )

    assert minimal.compatibility_score == broadened.compatibility_score
    assert "SQL" in broadened.additional_skills
    assert "Java" in broadened.additional_skills


# ---------------------------------------------------------------------------
# Importance weighting is separate from the headline score
# ---------------------------------------------------------------------------
def test_weighted_score_respects_importance_while_headline_does_not() -> None:
    requirements = [
        req("python", "Python", "high"),
        req("docker", "Docker", "low"),
    ]
    result = compute_match({"python"}, requirements, enable_semantic=False)

    assert result.compatibility_score == 50.0  # 1 of 2, unweighted
    # Python carries weight 100, Docker 25 -> 100/125.
    assert result.weighted_score == 80.0


# ---------------------------------------------------------------------------
# Semantic layer
# ---------------------------------------------------------------------------
def test_semantic_matching_finds_related_frameworks() -> None:
    """Django is a reasonable stand-in for a required Flask skill."""
    result = compute_match(
        {"django"},
        [req("flask", "Flask"), req("docker", "Docker")],
        enable_semantic=True,
        semantic_threshold=0.20,
    )
    assert result.compatibility_score == 0.0  # exact baseline is unchanged
    assert result.semantic_score > 0
    assert any(m["job_skill"] == "Flask" for m in result.semantic_matches)


def test_semantic_matching_can_be_disabled() -> None:
    result = compute_match(
        {"django"}, [req("flask", "Flask")], enable_semantic=False
    )
    assert result.semantic_score == 0.0
    assert result.semantic_matches == []


def test_semantic_credit_never_exceeds_the_exact_score() -> None:
    """A semantic match is inferred, so it must be worth less than a real one."""
    exact = compute_match({"python"}, [req("python", "Python")], enable_semantic=False)
    semantic = compute_match(
        {"python"},
        [req("python", "Python"), req("flask", "Flask")],
        enable_semantic=True,
        semantic_threshold=0.10,
    )

    assert exact.compatibility_score == 100.0
    # Adding a missing requirement can only pull the score down.
    assert semantic.compatibility_score == 50.0
    assert semantic.combined_score <= 50.0 + 25.0 + 1e-6


def test_identical_skill_is_not_reported_as_semantic() -> None:
    """Exact matches must never also appear as semantic matches."""
    result = compute_match(
        {"react"},
        [req("react", "React"), req("vue", "Vue")],
        enable_semantic=True,
        semantic_threshold=0.01,
    )
    assert all(m["job_skill"] != "React" for m in result.semantic_matches)


# ---------------------------------------------------------------------------
# Skill breakdown / explainability
# ---------------------------------------------------------------------------
def test_breakdown_marks_each_requirement() -> None:
    result = compute_match(
        {"python", "react"},
        [req("python", "Python"), req("react", "React"), req("docker", "Docker")],
        enable_semantic=False,
    )

    relations = {entry["skill"]: entry["relation"] for entry in result.skill_breakdown}
    assert relations == {"Python": "exact", "React": "exact", "Docker": "missing"}
    assert all(entry["slug"] for entry in result.skill_breakdown)


def test_taxonomy_slugs_are_unique() -> None:
    """Two skills must never collide on a slug, or they would be merged."""
    from app.ai.taxonomy import get_taxonomy

    taxonomy = get_taxonomy()
    slugs = [skill.slug for skill in taxonomy.skills]
    assert len(slugs) == len(set(slugs)), "duplicate skill slugs detected"
    # C, C++ and C# are the classic collision case.
    assert taxonomy.by_name["c"].slug == "c"
    assert taxonomy.by_name["c++"].slug == "c-plus-plus"
    assert taxonomy.by_name["c#"].slug == "c-sharp"
