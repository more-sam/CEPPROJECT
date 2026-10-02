"""Extract raw text and detect sections from PDF and DOCX resumes.

Real resumes are inconsistent, so every function here is written to degrade
gracefully: a missing section yields an empty list, never an exception.
"""

import re
import unicodedata
from dataclasses import dataclass, field

# Canonical section keys used throughout the application.
SECTION_ORDER = (
    "summary",
    "education",
    "experience",
    "projects",
    "skills",
    "certifications",
    "achievements",
)

# Heading phrases mapped to canonical section keys. Matching is done on a
# normalised heading line, so decoration ("- SKILLS -") is stripped first.
SECTION_HEADINGS: dict[str, str] = {
    "summary": "summary",
    "profile": "summary",
    "objective": "summary",
    "career objective": "summary",
    "about": "summary",
    "about me": "summary",
    "education": "education",
    "educational qualifications": "education",
    "academic background": "education",
    "academics": "education",
    "qualifications": "education",
    "experience": "experience",
    "work experience": "experience",
    "professional experience": "experience",
    "internship": "experience",
    "internships": "experience",
    "employment": "experience",
    "work history": "experience",
    "projects": "projects",
    "academic projects": "projects",
    "personal projects": "projects",
    "key projects": "projects",
    "skills": "skills",
    "technical skills": "skills",
    "technologies": "skills",
    "technical proficiencies": "skills",
    "core competencies": "skills",
    "skills and interests": "skills",
    "technical expertise": "skills",
    "certifications": "certifications",
    "certificates": "certifications",
    "licenses": "certifications",
    "courses": "certifications",
    "training": "certifications",
    "achievements": "achievements",
    "accomplishments": "achievements",
    "awards": "achievements",
    "honors": "achievements",
    "honours": "achievements",
    "positions of responsibility": "achievements",
    "extra curricular activities": "achievements",
    "extracurricular activities": "achievements",
}

EMAIL_PATTERN = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
# Indian and international formats, with or without country code.
PHONE_PATTERN = re.compile(
    r"(?:(?:\+|00)\d{1,3}[\s.-]?)?(?:\(?\d{2,5}\)?[\s.-]?)?\d{3,5}[\s.-]?\d{3,4}"
)
NAME_LINE_PATTERN = re.compile(r"^[A-Z][A-Za-z.'-]*(?:\s+[A-Z][A-Za-z.'-]*){1,3}$")


@dataclass
class ParsedResume:
    """Structured output of parsing a resume document."""

    text: str
    sections: dict[str, list[str]] = field(default_factory=dict)
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    word_count: int = 0
    # Non-fatal problems worth showing the student (e.g. "scanned PDF").
    warnings: list[str] = field(default_factory=list)


class ResumeParseError(Exception):
    """Raised when a document cannot be read at all."""


def _normalise_heading(line: str) -> str:
    """Turn "  === TECHNICAL SKILLS ===  " into "technical skills"."""
    cleaned = unicodedata.normalize("NFKD", line).strip()
    cleaned = re.sub(r"^[\W_]+|[\W_]+$", "", cleaned)  # strip decoration
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned.lower()


def _is_heading(line: str) -> str | None:
    """Return the canonical section key if this line is a section heading."""
    stripped = line.strip()
    if not stripped or len(stripped) > 60:
        return None
    # Headings are short and rarely end in sentence punctuation.
    if stripped.endswith((".", ",", ";", ":")) and len(stripped.split()) > 3:
        return None
    key = _normalise_heading(stripped)
    return SECTION_HEADINGS.get(key)


def extract_text_from_pdf(data: bytes) -> str:
    """Extract text from a PDF using PyMuPDF."""
    try:
        # PyMuPDF now publishes the `pymupdf` module name; `fitz` still works but
        # emits a deprecation warning, so prefer the new name when present.
        import pymupdf as fitz
    except ImportError:
        try:
            import fitz  # type: ignore[no-redef]
        except ImportError as exc:  # pragma: no cover - dependency is required
            raise ResumeParseError("PDF support is unavailable on the server.") from exc

    try:
        document = fitz.open(stream=data, filetype="pdf")
    except Exception as exc:  # noqa: BLE001 - any PyMuPDF failure is a parse failure
        raise ResumeParseError("That PDF could not be opened. It may be corrupted.") from exc

    try:
        if document.needs_pass:
            raise ResumeParseError("Password-protected PDFs are not supported.")
        pages = [page.get_text("text") for page in document]
    finally:
        document.close()

    return "\n".join(pages)


def _iter_block_items(document) -> list[str]:  # noqa: ANN001
    """Yield paragraph and table text in true document order.

    `document.paragraphs` and `document.tables` are separate collections, so
    concatenating them moves every table to the end of the document. That breaks
    section detection for the very common case of a skills table sitting under a
    "Technical Skills" heading. Walking the body XML preserves order.
    """
    from docx.oxml.ns import qn
    from docx.table import Table
    from docx.text.paragraph import Paragraph

    blocks: list[str] = []
    for child in document.element.body.iterchildren():
        if child.tag == qn("w:p"):
            blocks.append(Paragraph(child, document).text)
        elif child.tag == qn("w:tbl"):
            rows: list[str] = []
            for row in Table(child, document).rows:
                cells = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                if cells:
                    rows.append(" | ".join(cells))
            if rows:
                blocks.extend(rows)
    return blocks


def extract_text_from_docx(data: bytes) -> str:
    """Extract text from a DOCX file, including tables, in document order."""
    import io

    try:
        from docx import Document
    except ImportError as exc:  # pragma: no cover - dependency is required
        raise ResumeParseError("DOCX support is unavailable on the server.") from exc

    try:
        document = Document(io.BytesIO(data))
    except Exception as exc:  # noqa: BLE001
        raise ResumeParseError(
            "That DOCX file could not be opened. It may be corrupted or not a real .docx."
        ) from exc

    return "\n".join(_iter_block_items(document))


def extract_text(data: bytes, filename: str) -> str:
    """Dispatch to the right extractor based on the file extension."""
    lowered = (filename or "").lower()
    if lowered.endswith(".pdf"):
        return extract_text_from_pdf(data)
    if lowered.endswith(".docx"):
        return extract_text_from_docx(data)
    raise ResumeParseError("Only PDF and DOCX resumes are supported.")


def clean_text(text: str) -> str:
    """Normalise whitespace and drop control characters from extracted text."""
    if not text:
        return ""
    without_controls = "".join(
        char if char.isprintable() or char in "\n\t" else " " for char in text
    )
    # Collapse runs of spaces but keep line structure for section detection.
    without_controls = re.sub(r"[ \t\u00a0]+", " ", without_controls)
    without_controls = re.sub(r"\n{3,}", "\n\n", without_controls)
    return without_controls.strip()


def split_sections(text: str) -> dict[str, list[str]]:
    """Group resume lines under canonical section headings.

    Content that appears before the first recognised heading is kept under
    "summary" so it is never silently discarded.
    """
    sections: dict[str, list[str]] = {key: [] for key in SECTION_ORDER}
    current: str | None = None
    preamble: list[str] = []

    for raw_line in text.splitlines():
        line = raw_line.rstrip()
        if not line.strip():
            continue

        heading = _is_heading(line)
        if heading is not None:
            current = heading
            continue

        if current is None:
            preamble.append(line.strip())
        else:
            sections[current].append(line.strip())
            # A heading-like line that ends with a colon on the same line, e.g.
            # "Skills: Python, Java" - keep the values too.
            if ":" in line and len(line) < 200:
                _, _, remainder = line.partition(":")
                if remainder.strip():
                    sections[current].append(remainder.strip())

    if preamble:
        sections["summary"] = preamble + sections["summary"]

    return {key: values for key, values in sections.items() if values}


def _detect_name(text: str) -> str | None:
    """Best-effort name detection from the first few lines."""
    for line in text.splitlines()[:8]:
        candidate = line.strip()
        if not candidate or len(candidate) > 60:
            continue
        if EMAIL_PATTERN.search(candidate) or any(ch.isdigit() for ch in candidate):
            continue
        lowered = candidate.lower()
        if any(word in lowered for word in ("resume", "curriculum", "vitae", "cv")):
            continue
        if NAME_LINE_PATTERN.match(candidate):
            return candidate
    return None


def parse_resume(data: bytes, filename: str) -> ParsedResume:
    """Full pipeline: bytes -> text -> cleaned text -> sections -> metadata."""
    raw_text = extract_text(data, filename)
    text = clean_text(raw_text)

    if not text.strip():
        raise ResumeParseError(
            "No readable text was found. If this is a scanned or image-based PDF, "
            "export a text version and upload it again."
        )

    warnings: list[str] = []
    sections = split_sections(text)

    detected = set(sections) & set(SECTION_ORDER)
    if "skills" not in detected:
        warnings.append(
            "No 'Skills' section was detected, so skills were inferred from the "
            "whole document. Adding an explicit skills list improves accuracy."
        )

    email_match = EMAIL_PATTERN.search(text)
    phone_match = PHONE_PATTERN.search(text)

    return ParsedResume(
        text=text,
        sections=sections,
        name=_detect_name(text),
        email=email_match.group(0) if email_match else None,
        phone=phone_match.group(0).strip() if phone_match else None,
        word_count=len(text.split()),
        warnings=warnings,
    )
