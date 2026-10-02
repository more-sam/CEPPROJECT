"""Generate sample resume fixtures used by the tests and for manual checks.

Run with:  python tests/fixtures/make_fixtures.py

The fixtures deliberately differ in structure to exercise the parser's tolerance:
one follows the common "heading then bullets" convention, the other is terse with
inline "Skills: ..." lines, and one is intentionally near-empty.
"""

import io
from pathlib import Path

FIXTURE_DIR = Path(__file__).resolve().parent

RICH_RESUME = """ALEX SHARMA
alex.sharma@example.com | +91 98765 43210 | Bengaluru, India

SUMMARY
Final-year Computer Science student focused on backend and full-stack development.
Comfortable building REST APIs and working with relational databases.

TECHNICAL SKILLS
Languages: Python, JavaScript, TypeScript, SQL, C++
Frameworks: React, FastAPI, Node.js, Express
Databases: PostgreSQL, MongoDB, Redis
Tools: Git, GitHub, Docker, Postman, VS Code
Cloud: AWS

EXPERIENCE
Backend Developer Intern, NimbusStack (Jun 2025 - Aug 2025)
- Built REST API endpoints with FastAPI and PostgreSQL
- Containerised services with Docker and CI/CD pipelines using GitHub Actions
- Wrote unit testing suites with pytest

PROJECTS
SkillBridge AI - career intelligence platform
- React frontend with TypeScript and Tailwind CSS
- FastAPI backend with SQLAlchemy, Alembic migrations and JWT authentication
- Implemented semantic matching with scikit-learn and Pandas

Campus Placement Portal
- Django application with PostgreSQL and Redis caching
- Deployed on AWS using Docker and Nginx

EDUCATION
B.Tech in Computer Science, Government College of Engineering, 2027
Relevant coursework: Data Structures, Algorithms, Operating Systems, DBMS,
Computer Networks, Machine Learning

CERTIFICATIONS
- AWS Certified Cloud Practitioner
- Machine Learning Specialisation (Coursera)

ACHIEVEMENTS
- Winner, inter-college hackathon 2025
- Solved 400+ problems on competitive programming platforms
"""

TERSE_RESUME = """PRIYA NAIR
priya.nair@example.com

Skills: SQL, Excel, Power BI, Python, Pandas, Tableau, Data Visualization
Tools: Jira, Agile, Git
Soft skills: Communication, Teamwork

Experience
Data Analyst Intern at Aster Analytics for 6 months
Built dashboards in Power BI and wrote SQL queries for reporting

Education
B.Sc Statistics, 2026

Projects
Retail sales analysis using Python and Pandas
"""

NEARLY_EMPTY_RESUME = """JOHN DOE
john@example.com

Some text but no recognised sections at all.
"""


def build_docx(text: str) -> bytes:
    """Render text as a DOCX, splitting blank lines into separate paragraphs."""
    from docx import Document

    document = Document()
    for block in text.strip().split("\n"):
        document.add_paragraph(block)
    buffer = io.BytesIO()
    document.save(buffer)
    return buffer.getvalue()


def build_docx_with_table() -> bytes:
    """A DOCX whose skills live in a table, which python-docx handles separately."""
    from docx import Document

    document = Document()
    document.add_paragraph("MEERA IYER")
    document.add_paragraph("meera.iyer@example.com")
    document.add_paragraph("Technical Skills")

    table = document.add_table(rows=3, cols=2)
    table.cell(0, 0).text = "Languages"
    table.cell(0, 1).text = "Python, Java, SQL"
    table.cell(1, 0).text = "Frameworks"
    table.cell(1, 1).text = "Spring Boot, Django"
    table.cell(2, 0).text = "Tools"
    table.cell(2, 1).text = "Docker, Git, Kubernetes"

    document.add_paragraph("Education")
    document.add_paragraph("B.E. Information Science, 2026")

    buffer = io.BytesIO()
    document.save(buffer)
    return buffer.getvalue()


def build_pdf(text: str) -> bytes:
    """Render text as a simple PDF using PyMuPDF."""
    try:
        import pymupdf as fitz
    except ImportError:  # older PyMuPDF releases expose the module as `fitz`
        import fitz

    document = fitz.open()
    # Break into pages of ~45 lines so long resumes exercise multi-page parsing.
    lines = text.strip().split("\n")
    for start in range(0, max(len(lines), 1), 45):
        page = document.new_page()
        chunk = "\n".join(lines[start : start + 45])
        page.insert_text((56, 64), chunk, fontsize=10)
    payload = document.tobytes()
    document.close()
    return payload


def main() -> None:
    FIXTURE_DIR.mkdir(parents=True, exist_ok=True)

    outputs = {
        "resume_rich.pdf": build_pdf(RICH_RESUME),
        "resume_rich.docx": build_docx(RICH_RESUME),
        "resume_terse.docx": build_docx(TERSE_RESUME),
        "resume_table.docx": build_docx_with_table(),
        "resume_sparse.docx": build_docx(NEARLY_EMPTY_RESUME),
    }

    for name, data in outputs.items():
        path = FIXTURE_DIR / name
        path.write_bytes(data)
        print(f"  {name:26} {len(data):>7} bytes")

    print(f"\nWrote {len(outputs)} fixtures to {FIXTURE_DIR}")


if __name__ == "__main__":
    main()
