"""Resume upload, parsing and skill extraction orchestration.

Privacy rules enforced here:
- Uploaded files are stored under a generated name, never the raw user filename,
  so a crafted filename cannot influence the path on disk.
- The stored path is never returned by any API response.
- Resume text is never written to logs.
"""

import re
import uuid
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.ai.resume_parser import ParsedResume, ResumeParseError, parse_resume
from app.ai.skill_extractor import ExtractedSkill, extract_skills_from_sections
from app.ai.taxonomy import get_taxonomy
from app.core.config import settings
from app.models.enums import AnalysisStatus, SkillSource
from app.models.profile import StudentProfile
from app.models.resume import Resume
from app.models.skill import Skill, StudentSkill
from app.services.profile_service import get_or_create_skill

# Only this character set survives into the stored display filename.
SAFE_FILENAME_PATTERN = re.compile(r"[^A-Za-z0-9._ -]")

# Skills mentioned only in passing are not automatically added to the profile;
# this threshold keeps obvious noise out of the student's skill list.
AUTO_ADD_CONFIDENCE = 0.70


class ResumeError(Exception):
    """Upload/analysis failure with a message safe to show a student."""

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


def sanitise_filename(filename: str) -> str:
    """Strip directory components and unsafe characters from a client filename."""
    base = Path(filename or "resume").name
    cleaned = SAFE_FILENAME_PATTERN.sub("_", base).strip() or "resume"
    # Guard against a pure-dots name surviving the filter.
    if cleaned.strip(". ") == "":
        cleaned = "resume"
    return cleaned[:200]


def validate_upload(filename: str, size_bytes: int) -> str:
    """Validate extension and size, returning the normalised extension."""
    extension = Path(filename or "").suffix.lower()
    allowed = [item.lower() for item in settings.allowed_resume_extensions]

    if extension not in allowed:
        readable = " or ".join(item.upper().lstrip(".") for item in allowed)
        raise ResumeError(
            f"Unsupported file type '{extension or 'unknown'}'. Please upload a {readable} file."
        )

    if size_bytes <= 0:
        raise ResumeError("That file is empty.")

    if size_bytes > settings.max_upload_size_bytes:
        raise ResumeError(
            f"That file is {size_bytes / (1024 * 1024):.1f} MB. "
            f"The limit is {settings.max_upload_size_mb} MB."
        )

    return extension


def _store_file(data: bytes, extension: str) -> Path:
    """Write the upload to the private upload directory under a generated name."""
    upload_dir = Path(settings.upload_dir)
    try:
        upload_dir.mkdir(parents=True, exist_ok=True)
    except OSError as exc:
        raise ResumeError(
            "The server could not store the upload. Please try again."
        ) from exc

    # A random name means two students uploading "resume.pdf" never collide, and
    # the original name cannot be used for path traversal.
    target = upload_dir / f"{uuid.uuid4().hex}{extension}"
    target.write_bytes(data)
    return target


def analyse_upload(
    db: Session,
    profile: StudentProfile,
    filename: str,
    data: bytes,
    *,
    auto_add_skills: bool = True,
) -> tuple[Resume, ParsedResume, list[ExtractedSkill]]:
    """Full pipeline: validate -> store -> parse -> extract -> persist.

    Raises ResumeError with a student-friendly message at any failure point, and
    leaves a `failed` resume row so the UI can show what went wrong.
    """
    display_name = sanitise_filename(filename)
    extension = validate_upload(display_name, len(data))
    stored_path = _store_file(data, extension)

    resume = Resume(
        student_id=profile.id,
        filename=display_name,
        file_type=extension.lstrip("."),
        storage_path=str(stored_path),
        file_size_bytes=len(data),
        analysis_status=AnalysisStatus.PROCESSING.value,
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)

    try:
        parsed = parse_resume(data, display_name)
    except ResumeParseError as exc:
        resume.analysis_status = AnalysisStatus.FAILED.value
        # Store only the parser's own message - never the document contents.
        resume.analysis_error = str(exc)[:500]
        db.add(resume)
        db.commit()
        raise ResumeError(str(exc)) from exc
    except Exception as exc:  # noqa: BLE001 - unexpected parser failure
        resume.analysis_status = AnalysisStatus.FAILED.value
        resume.analysis_error = "Unexpected parsing error."
        db.add(resume)
        db.commit()
        raise ResumeError(
            "Something went wrong while reading that document. Please try a different file."
        ) from exc

    detected = extract_skills_from_sections(parsed.sections, parsed.text)

    resume.extracted_text = parsed.text
    resume.sections = parsed.sections
    resume.analysis_status = AnalysisStatus.COMPLETED.value
    resume.analysis_error = None
    resume.skill_count = len(detected)
    db.add(resume)

    if auto_add_skills:
        _persist_skills(db, profile, detected)

    db.commit()
    db.refresh(resume)
    return resume, parsed, detected


def _persist_skills(
    db: Session,
    profile: StudentProfile,
    detected: list[ExtractedSkill],
) -> None:
    """Add confidently-extracted skills to the profile, keeping the best evidence.

    A skill already added manually is never downgraded: if the student asserts
    something, the extractor's guess does not overwrite it.
    """
    for item in detected:
        if item.confidence < AUTO_ADD_CONFIDENCE:
            continue

        skill = get_or_create_skill(db, item.name)
        existing = db.scalar(
            select(StudentSkill).where(
                StudentSkill.student_id == profile.id,
                StudentSkill.skill_id == skill.id,
            )
        )
        if existing is None:
            db.add(
                StudentSkill(
                    student_id=profile.id,
                    skill_id=skill.id,
                    proficiency="unknown",
                    confidence=round(item.confidence, 2),
                    source=SkillSource.RESUME.value,
                )
            )
        elif existing.source == SkillSource.RESUME.value:
            # Re-uploading a resume should raise confidence, not add duplicates.
            existing.confidence = max(existing.confidence, round(item.confidence, 2))
            db.add(existing)


def list_resumes(db: Session, profile: StudentProfile) -> list[Resume]:
    return list(
        db.scalars(
            select(Resume)
            .where(Resume.student_id == profile.id)
            .order_by(Resume.uploaded_at.desc())
        )
    )


def get_resume(db: Session, profile: StudentProfile, resume_id: int) -> Resume | None:
    resume = db.get(Resume, resume_id)
    if resume is None or resume.student_id != profile.id:
        return None
    return resume


def delete_resume(db: Session, profile: StudentProfile, resume_id: int) -> bool:
    """Delete the row and the file on disk."""
    resume = get_resume(db, profile, resume_id)
    if resume is None:
        return False

    path = Path(resume.storage_path)
    try:
        if path.is_file() and path.parent == Path(settings.upload_dir):
            path.unlink()
    except OSError:
        # A locked or already-deleted file must not block the database cleanup.
        pass

    db.delete(resume)
    db.commit()
    return True


def latest_resume(db: Session, profile: StudentProfile) -> Resume | None:
    return db.scalar(
        select(Resume)
        .where(Resume.student_id == profile.id)
        .order_by(Resume.uploaded_at.desc())
        .limit(1)
    )


def reanalyse(db: Session, profile: StudentProfile, resume: Resume) -> list[ExtractedSkill]:
    """Re-run extraction on stored text without re-uploading the file.

    Useful after the taxonomy is extended, since previously unseen skills may now
    be recognised.
    """
    if not resume.extracted_text:
        raise ResumeError("This resume has no stored text to analyse.")

    from app.ai.resume_parser import split_sections

    sections = resume.sections or split_sections(resume.extracted_text)
    detected = extract_skills_from_sections(sections, resume.extracted_text)

    resume.skill_count = len(detected)
    resume.sections = sections
    resume.analysis_status = AnalysisStatus.COMPLETED.value
    db.add(resume)

    _persist_skills(db, profile, detected)
    db.commit()
    return detected


def skills_by_category(detected: list[ExtractedSkill]) -> dict[str, list[str]]:
    """Group extracted skills by taxonomy category for the analysis view."""
    grouped: dict[str, list[str]] = {}
    for item in detected:
        grouped.setdefault(item.category, []).append(item.name)
    return {category: sorted(names) for category, names in sorted(grouped.items())}


def stored_skill_slugs(db: Session, profile: StudentProfile) -> set[str]:
    """Slugs already saved on the profile, used to mark extracted skills as saved."""
    rows = db.execute(
        select(Skill.slug)
        .join(StudentSkill, StudentSkill.skill_id == Skill.id)
        .where(StudentSkill.student_id == profile.id)
    )
    return {slug for (slug,) in rows}


def taxonomy_categories() -> list[str]:
    return list(get_taxonomy().categories)
