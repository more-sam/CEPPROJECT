"""AI Career Assistant.

Two implementations share one interface:

1. **Deterministic (always available).** Answers are computed from the student's
   own stored data: skills, gaps, recommendations, roadmap and assessment
   results. This is the default and requires no API key.
2. **LLM (optional).** When `AI_PROVIDER` and `AI_API_KEY` are configured, the
   same grounded context is sent to the provider for a more conversational
   answer. Any failure falls back to the deterministic path, so the assistant
   never becomes a dead end.
"""

from dataclasses import dataclass, field
from datetime import UTC, datetime

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.models.assessment import Assessment, AssessmentResult
from app.models.job import Job
from app.models.profile import StudentProfile
from app.models.skill import StudentSkill
from app.schemas.assistant import ChatMessage, ChatResponse, ChatSource
from app.services.progress_service import overview
from app.services.recommendation_service import demand_summary, recommend_for_student
from app.services.roadmap_service import active_roadmap
from app.services.resume_service import latest_resume

SUGGESTED_PROMPTS = [
    "What should I learn next?",
    "Which roles match my current skills?",
    "What skills appear most often in my recommended jobs?",
    "How can I improve my resume?",
    "Help me prepare for this role.",
    "Why is this skill recommended?",
]

LLM_TIMEOUT_SECONDS = 25.0

SYSTEM_PROMPT = """You are the SkillBridge AI career assistant for a college student.

Rules you must follow:
- Use ONLY the student context provided. If something is not in it, say so plainly.
- Never describe the compatibility score as a hiring probability, chance of
  selection, or any guarantee of an interview or job. It measures how closely the
  student's skills align with a role's requirements.
- Never invent opportunities, companies, skills or scores.
- Be concise and concrete. Prefer short paragraphs or bullet points.
- When suggesting learning, explain why it matters using the student's data.
"""


@dataclass
class AssistantContext:
    """Everything the assistant is allowed to reason over."""

    name: str
    has_resume: bool
    resume_filename: str | None = None
    skills: list[str] = field(default_factory=list)
    skill_categories: dict[str, list[str]] = field(default_factory=dict)
    recommendations: list[dict] = field(default_factory=list)
    gaps: list[dict] = field(default_factory=list)
    roadmap: list[dict] = field(default_factory=list)
    roadmap_title: str | None = None
    assessments: list[dict] = field(default_factory=list)
    progress: dict = field(default_factory=dict)

    def as_prompt_block(self) -> str:
        """Render the context as compact text for an LLM prompt."""
        lines = [f"Student first name: {self.name}"]
        lines.append(
            f"Resume uploaded: {'yes (' + self.resume_filename + ')' if self.has_resume else 'no'}"
        )

        if self.skills:
            lines.append(f"Identified skills ({len(self.skills)}): {', '.join(self.skills)}")
        else:
            lines.append("Identified skills: none yet")

        if self.recommendations:
            lines.append("Top recommended opportunities:")
            for item in self.recommendations[:5]:
                lines.append(
                    f"  - {item['title']} at {_company_name(item)} ({item['location']}), "
                    f"{item['compatibility_score']:.0f}% skill alignment. "
                    f"Matched: {', '.join(item['matched_skills']) or 'none'}. "
                    f"Gaps: {', '.join(item['missing_skills']) or 'none'}."
                )

        if self.gaps:
            lines.append("Most in-demand missing skills:")
            for gap in self.gaps[:8]:
                lines.append(
                    f"  - {gap['name']} ({gap['category']}): needed by "
                    f"{gap['jobs_requiring']} of {gap['total_jobs']} target roles"
                )

        if self.roadmap:
            lines.append(f"Active roadmap: {self.roadmap_title}")
            for item in self.roadmap[:8]:
                lines.append(
                    f"  - {item['skill']} [{item['priority']} priority, {item['status']}]: "
                    f"{item['reason']}"
                )

        if self.assessments:
            lines.append("Assessment history:")
            for attempt in self.assessments[:5]:
                lines.append(
                    f"  - {attempt['title']}: {attempt['score']:.0f}% "
                    f"({'passed' if attempt['passed'] else 'not passed'})"
                )

        lines.append(
            f"Progress: {self.progress.get('mastered', 0)} mastered, "
            f"{self.progress.get('developing', 0)} developing, "
            f"{self.progress.get('not_started', 0)} not started. "
            f"Roadmap completion {self.progress.get('roadmap_progress_percentage', 0):.0f}%."
        )
        return "\n".join(lines)


def build_context(db: Session, profile: StudentProfile, email: str) -> AssistantContext:
    """Assemble the student's grounded context."""
    rows = db.execute(
        select(StudentSkill)
        .options(selectinload(StudentSkill.skill))
        .where(StudentSkill.student_id == profile.id)
    ).scalars().all()

    skills: list[str] = []
    categories: dict[str, list[str]] = {}
    for row in rows:
        skills.append(row.skill.name)
        categories.setdefault(row.skill.category, []).append(row.skill.name)

    resume = latest_resume(db, profile)
    ranked, _ = recommend_for_student(db, profile, limit=8)

    from app.services.recommendation_service import job_card_payload

    recommendations = [job_card_payload(item, set(), semantic=True) for item in ranked]

    gaps = [
        {
            "name": info["name"],
            "slug": slug,
            "category": info["category"],
            "jobs_requiring": info["jobs_requiring"],
            "total_jobs": info["total_jobs"],
            "importance": info["highest_importance"],
        }
        for slug, info in demand_summary(db, profile, limit=60).items()
    ]
    gaps.sort(key=lambda item: (-item["jobs_requiring"], item["name"]))

    roadmap_items: list[dict] = []
    roadmap_title: str | None = None
    roadmap = active_roadmap(db, profile)
    if roadmap is not None:
        roadmap_title = roadmap.title
        roadmap_items = [
            {
                "skill": item.skill.name,
                "priority": item.priority,
                "status": item.status,
                "reason": item.reason,
                "estimated_hours": item.estimated_hours,
            }
            for item in roadmap.items
        ]

    attempts = [
        {
            "title": result.assessment.title,
            "score": result.score,
            "passed": result.passed,
        }
        for result in db.scalars(
            select(AssessmentResult)
            .options(
                selectinload(AssessmentResult.assessment).selectinload(Assessment.skill)
            )
            .where(AssessmentResult.student_id == profile.id)
            .order_by(AssessmentResult.completed_at.desc())
            .limit(6)
        )
    ]

    name = (profile.full_name or email.split("@")[0]).strip().split()[0]

    return AssistantContext(
        name=name,
        has_resume=resume is not None,
        resume_filename=resume.filename if resume else None,
        skills=sorted(skills),
        skill_categories={key: sorted(value) for key, value in sorted(categories.items())},
        recommendations=recommendations,
        gaps=gaps,
        roadmap=roadmap_items,
        roadmap_title=roadmap_title,
        assessments=attempts,
        progress=overview(db, profile),
    )


# ---------------------------------------------------------------------------
# Deterministic answers
# ---------------------------------------------------------------------------
def _company_name(item: dict) -> str:
    """Read a company name out of a canonical opportunity-card payload.

    The card shape nests the company object (matching `GET /api/jobs`), so this
    keeps the answer-building code readable and tolerant of both shapes.
    """
    company = item.get("company")
    if isinstance(company, dict):
        return str(company.get("name") or "Unknown company")
    return str(company or "Unknown company")


def _detect_intent(message: str) -> str:
    text = message.lower()

    if any(phrase in text for phrase in ("most often", "appear most", "common skill", "in demand", "most in demand", "frequently")):
        return "demand"
    if any(phrase in text for phrase in ("improve my resume", "resume better", "fix my resume", "resume advice", "strengthen my resume")):
        return "resume"
    if any(phrase in text for phrase in ("prepare for", "help me prepare", "get ready")):
        return "prepare"
    if any(phrase in text for phrase in ("which roles", "what roles", "what jobs", "which jobs", "match my skills", "suit me", "good fit")):
        return "roles"
    if text.startswith("why") or "why is" in text or "why do i" in text or "why should" in text:
        return "why"
    if any(phrase in text for phrase in ("what should i learn", "learn next", "study next", "what next", "what do i learn")):
        return "learn_next"
    if any(phrase in text for phrase in ("my skills", "what are my skills", "skills do i have")):
        return "my_skills"
    if any(phrase in text for phrase in ("progress", "how am i doing", "how far")):
        return "progress"
    return "overview"


def _bullet(items: list[str]) -> str:
    return "\n".join(f"• {item}" for item in items)


def _answer_locally(context: AssistantContext, message: str) -> tuple[str, list[ChatSource]]:
    """Produce a grounded answer without any external provider."""
    intent = _detect_intent(message)
    sources: list[ChatSource] = []

    if not context.skills:
        return (
            f"I don't have any skills on your profile yet, {context.name}. "
            "Upload your resume on the Resume Analysis page and I'll extract your "
            "skills, then match them against internships and entry-level roles.",
            [ChatSource(label="Profile", detail="No skills recorded")],
        )

    sources.append(
        ChatSource(label="Your skills", detail=f"{len(context.skills)} identified")
    )

    if intent == "demand":
        if not context.gaps:
            return (
                "Every skill your recommended roles ask for is already on your "
                "profile, so nothing stands out as most in demand.",
                sources,
            )
        lines = [
            f"{gap['name']} — needed by {gap['jobs_requiring']} of "
            f"{gap['total_jobs']} target roles ({gap['category']})"
            for gap in context.gaps[:6]
        ]
        sources.append(ChatSource(label="Recommendations", detail=f"{len(context.recommendations)} roles analysed"))
        return (
            "Across your recommended opportunities, these skills come up most:\n\n"
            + _bullet(lines)
            + "\n\nStart with the first one — it unlocks the most roles.",
            sources,
        )

    if intent == "learn_next":
        if context.roadmap:
            pending = [item for item in context.roadmap if item["status"] != "completed"]
            if pending:
                nxt = pending[0]
                return (
                    f"Next up: {nxt['skill']}.\n\n{nxt['reason']}\n\n"
                    f"Priority: {nxt['priority']}. Estimated effort: about "
                    f"{nxt['estimated_hours']} hours. Your roadmap has "
                    f"{len(pending)} step{'s' if len(pending) != 1 else ''} left.",
                    sources + [ChatSource(label="Roadmap", detail=context.roadmap_title or "")],
                )
        if context.gaps:
            top = context.gaps[0]
            return (
                f"Learn {top['name']} next.\n\nIt's needed by {top['jobs_requiring']} "
                f"of your {top['total_jobs']} target roles, which makes it the "
                "highest-leverage gap right now. Generate a roadmap and I'll order "
                "it so prerequisites come first.",
                sources,
            )
        return (
            "You already cover the skills your recommended roles ask for. Look at "
            "higher-seniority postings or broaden your preferred roles to find the "
            "next gap worth closing.",
            sources,
        )

    if intent == "why":
        if context.gaps:
            top = context.gaps[0]
            return (
                f"{top['name']} shows up because {top['jobs_requiring']} of your "
                f"{top['total_jobs']} recommended roles list it as a requirement "
                f"({top['category']}). Closing it would raise your SkillBridge "
                "Compatibility on those roles.\n\n"
                "That score measures skill alignment only — it is not a hiring "
                "prediction.",
                sources,
            )
        return (
            "Nothing is flagged as a gap right now, so there's no specific skill "
            "to explain. Your recommended roles are all well covered by your "
            "current skills.",
            sources,
        )

    if intent == "roles":
        if not context.recommendations:
            return (
                "I don't have any matching roles yet. Add skills to your profile or "
                "upload a resume, then check the Opportunities page.",
                sources,
            )
        lines = [
            f"{item['title']} at {_company_name(item)} — {item['compatibility_score']:.0f}% "
            f"skill alignment ({item['location']})"
            for item in context.recommendations[:5]
        ]
        sources.append(ChatSource(label="Opportunities", detail="Ranked by skill alignment"))
        return (
            "These roles line up best with the skills on your profile:\n\n"
            + _bullet(lines)
            + "\n\nCompatibility reflects skill alignment, not your likelihood of "
            "being hired.",
            sources,
        )

    if intent == "resume":
        advice: list[str] = []
        resume = context.resume_filename
        if not resume:
            advice.append(
                "Upload a PDF or DOCX resume on the Resume Analysis page — nothing "
                "can be matched until there is one."
            )
        else:
            advice.append(f"I analysed {resume}.")
        advice.append(
            f"Your profile currently shows {len(context.skills)} skills. A dedicated "
            "'Skills' section listing tools and languages explicitly makes extraction "
            "far more accurate."
        )
        if context.gaps:
            advice.append(
                "Only include skills you can genuinely discuss. If you have used "
                f"{context.gaps[0]['name']}, add it — it is required by "
                f"{context.gaps[0]['jobs_requiring']} of your target roles."
            )
        advice.append(
            "Quantify project outcomes (numbers, scale, impact) rather than listing "
            "responsibilities."
        )
        return (
            "Here's how to strengthen your resume:\n\n" + _bullet(advice),
            sources,
        )

    if intent == "prepare":
        if context.roadmap:
            pending = [i for i in context.roadmap if i["status"] != "completed"]
            lines = [
                f"{item['skill']} — {item['priority']} priority, ~{item['estimated_hours']}h"
                for item in pending[:5]
            ]
            return (
                "Work through your roadmap in order:\n\n"
                + _bullet(lines)
                + "\n\nAfter each step, take the matching assessment — passing it "
                "updates your progress and adds the skill to your profile.",
                sources + [ChatSource(label="Roadmap", detail=context.roadmap_title or "")],
            )
        if context.gaps:
            lines = [
                f"{gap['name']} — needed by {gap['jobs_requiring']} roles"
                for gap in context.gaps[:5]
            ]
            return (
                "Based on your target roles, focus on:\n\n" + _bullet(lines),
                sources,
            )
        return (
            "You already cover the required skills for your targets. Focus on "
            "practice projects and interview preparation for the technologies you "
            "already list.",
            sources,
        )

    if intent == "my_skills":
        lines = [
            f"{category}: {', '.join(names)}"
            for category, names in list(context.skill_categories.items())[:8]
        ]
        return (
            f"You have {len(context.skills)} skills on your profile:\n\n" + _bullet(lines),
            sources,
        )

    if intent == "progress":
        progress = context.progress
        return (
            f"You've mastered {progress.get('mastered', 0)} skills and have "
            f"{progress.get('developing', 0)} in progress. Roadmap completion is "
            f"{progress.get('roadmap_progress_percentage', 0):.0f}%, and you've taken "
            f"{progress.get('assessments_taken', 0)} assessment(s) with an average of "
            f"{progress.get('average_assessment_score', 0):.0f}%.",
            sources,
        )

    # Default overview.
    summary = [f"{len(context.skills)} skills identified"]
    if context.recommendations:
        best = context.recommendations[0]
        summary.append(
            f"{len(context.recommendations)} matching opportunities, best is "
            f"{best['title']} at {_company_name(best)} "
            f"({best['compatibility_score']:.0f}%)"
        )
    if context.gaps:
        summary.append(
            f"top gap is {context.gaps[0]['name']} "
            f"(needed by {context.gaps[0]['jobs_requiring']} roles)"
        )
    if context.roadmap:
        steps = len(context.roadmap)
        summary.append(f"roadmap has {steps} step{'s' if steps != 1 else ''}")

    return (
        f"Here's where you stand, {context.name}:\n\n"
        + _bullet(summary)
        + "\n\nAsk me what to learn next, why a skill is recommended, or which "
        "roles match your skills.",
        sources,
    )


# ---------------------------------------------------------------------------
# Optional LLM
# ---------------------------------------------------------------------------
def _provider_url() -> str:
    if settings.ai_provider == "openai-compatible" and settings.ai_base_url:
        return f"{settings.ai_base_url.rstrip('/')}/chat/completions"
    return "https://api.openai.com/v1/chat/completions"


def _call_llm(context: AssistantContext, message: str, history: list[ChatMessage]) -> str:
    """Ask the configured provider. Raises on any failure so we can fall back."""
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "system",
            "content": "Student context:\n" + context.as_prompt_block(),
        },
    ]
    # Keep only the recent turns, and never let a huge history dominate.
    for turn in history[-8:]:
        role = "user" if turn.role == "user" else "assistant"
        messages.append({"role": role, "content": turn.content[:2000]})

    messages.append({"role": "user", "content": message})

    response = httpx.post(
        _provider_url(),
        headers={
            "Authorization": f"Bearer {settings.ai_api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": settings.ai_model,
            "messages": messages,
            "temperature": 0.3,
            "max_tokens": 600,
        },
        timeout=LLM_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    payload = response.json()
    return payload["choices"][0]["message"]["content"].strip()


def answer(
    db: Session,
    profile: StudentProfile,
    email: str,
    message: str,
    history: list[ChatMessage] | None = None,
) -> ChatResponse:
    """Answer a question, preferring the LLM when configured."""
    context = build_context(db, profile, email)
    history = history or []

    local_reply, sources = _answer_locally(context, message)

    if settings.llm_enabled:
        try:
            reply = _call_llm(context, message, history)
            if reply:
                sources.append(
                    ChatSource(
                        label="AI provider",
                        detail=f"{settings.ai_provider} · {settings.ai_model}",
                    )
                )
                return ChatResponse(
                    reply=reply,
                    mode="llm",
                    sources=sources,
                    suggested_prompts=SUGGESTED_PROMPTS,
                    created_at=datetime.now(UTC),
                )
        except Exception:  # noqa: BLE001 - any provider problem falls back
            # A provider outage must never break the assistant. Record that we
            # answered locally rather than silently pretending the model replied.
            sources.append(
                ChatSource(
                    label="AI provider",
                    detail="Unavailable — answered from your stored data instead.",
                )
            )

    return ChatResponse(
        reply=local_reply,
        mode="local",
        sources=sources,
        suggested_prompts=SUGGESTED_PROMPTS,
        created_at=datetime.now(UTC),
    )


def capabilities() -> dict:
    """Report honestly which assistant mode is active."""
    if settings.llm_enabled:
        note = (
            f"Answers are generated by {settings.ai_provider} "
            f"({settings.ai_model}) using only your stored data as context."
        )
    else:
        note = (
            "No AI provider is configured, so answers are computed directly from "
            "your skills, gaps, roadmap and assessment results. Set AI_PROVIDER and "
            "AI_API_KEY to enable conversational answers."
        )

    return {
        "llm_enabled": settings.llm_enabled,
        "provider": settings.ai_provider,
        "model": settings.ai_model if settings.llm_enabled else None,
        "note": note,
        "suggested_prompts": SUGGESTED_PROMPTS,
    }


def available_assessments(db: Session, profile: StudentProfile) -> list[dict]:
    """Skills with an assessment that the student has not yet passed."""
    passed_ids = {
        result.assessment_id
        for result in db.scalars(
            select(AssessmentResult).where(
                AssessmentResult.student_id == profile.id,
                AssessmentResult.passed.is_(True),
            )
        )
    }
    rows = db.scalars(
        select(Assessment)
        .options(selectinload(Assessment.skill))
        .where(Assessment.id.notin_(passed_ids) if passed_ids else True)
        .limit(5)
    ).all()
    return [{"id": row.id, "title": row.title, "skill": row.skill.name} for row in rows]


def job_titles(db: Session, profile: StudentProfile, limit: int = 5) -> list[str]:
    """Titles of the student's recommended roles, for prompt grounding."""
    ranked, _ = recommend_for_student(db, profile, limit=limit)
    return [
        f"{item.job.title} at {item.job.company.name}"
        for item in ranked
        if item.job.company is not None
    ]


def company_names(db: Session, limit: int = 5) -> list[str]:
    rows = db.execute(select(Job.title).limit(limit))
    return [title for (title,) in rows]
