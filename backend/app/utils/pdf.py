from fastapi import HTTPException, status
from jinja2 import BaseLoader, Environment, select_autoescape


class DictLoader(BaseLoader):
    def __init__(self, templates):
        self.templates = templates

    def get_source(self, environment, template):
        if template in self.templates:
            return self.templates[template], template, lambda: True
        raise Exception(f"Template {template} not found")


TEMPLATES = {
    "tc.html": """
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 30px; }
            .title { text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 30px; text-decoration: underline; }
            .content { line-height: 2; font-size: 16px; }
            .footer { margin-top: 80px; display: flex; justify-content: space-between; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>{{ school.name }}</h1>
            <p>{{ school.address }} | Affiliation: {{ school.board_affiliation }}</p>
        </div>
        <div class="title">TRANSFER CERTIFICATE</div>
        <div class="content">
            <p>1. Name of Pupil: <strong>{{ student.first_name }} {{ student.last_name }}</strong></p>
            <p>2. Father's/Guardian's Name: <strong>{{ parent.father_name or parent.guardian_name }}</strong></p>
            <p>3. Mother's Name: <strong>{{ parent.mother_name }}</strong></p>
            <p>4. Nationality: <strong>{{ student.nationality }}</strong></p>
            <p>5. Date of Birth: <strong>{{ student.dob }}</strong></p>
            <p>6. Admission Number: <strong>{{ student.admission_number }}</strong></p>
            <p>7. Class in which pupil last studied: <strong>{{ class_name }}</strong></p>
            <p>8. General Conduct: <strong>Good</strong></p>
            <p>9. Date of issue of certificate: <strong>{{ issue_date }}</strong></p>
        </div>
        <div class="footer">
            <div>Prepared By<br>_______________</div>
            <div>Checked By<br>_______________</div>
            <div>Principal's Signature<br>_______________</div>
        </div>
    </body>
    </html>
    """,
    "timetable.html": """
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #000; padding: 12px; text-align: center; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .slot-subject { font-weight: bold; font-size: 14px; }
            .slot-teacher { font-size: 12px; color: #555; }
        </style>
    </head>
    <body>
        <div class="header">
            <h2>{{ school.name }}</h2>
            <h3>Class Timetable: {{ class_name }} - {{ section_name }}</h3>
        </div>
        <table>
            <thead>
                <tr>
                    <th>Day / Period</th>
                    {% for period in periods %}
                    <th>{{ period.name }}<br><span style="font-size: 10px; font-weight: normal;">{{ period.start_time }} - {{ period.end_time }}</span></th>
                    {% endfor %}
                </tr>
            </thead>
            <tbody>
                {% for day in days %}
                <tr>
                    <th>{{ day }}</th>
                    {% for period in periods %}
                    <td>
                        {% if slots[day][period.id] %}
                        <div class="slot-subject">{{ slots[day][period.id].subject_name }}</div>
                        <div class="slot-teacher">{{ slots[day][period.id].teacher_name }}</div>
                        {% else %}
                        -
                        {% endif %}
                    </td>
                    {% endfor %}
                </tr>
                {% endfor %}
            </tbody>
        </table>
    </body>
    </html>
    """,
    "bonafide.html": """
    <html>
    <head>
        <style>
            body { font-family: 'Times New Roman', serif; padding: 50px; line-height: 1.8; }
            .header { text-align: center; margin-bottom: 40px; }
            .title { text-align: center; font-size: 28px; font-weight: bold; margin-bottom: 40px; text-decoration: underline; letter-spacing: 2px; }
            .content { font-size: 18px; text-align: justify; }
            .footer { margin-top: 100px; display: flex; justify-content: space-between; font-size: 18px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>{{ school.name }}</h1>
            <p>{{ school.address }}</p>
        </div>
        <div class="title">BONAFIDE CERTIFICATE</div>
        <div class="content">
            <p>This is to certify that <strong>{{ student.first_name }} {{ student.last_name }}</strong>, 
            son/daughter of <strong>{{ parent.father_name or parent.guardian_name }}</strong>, is a bonafide student of this institution.</p>
            <p>He/She is currently studying in Class <strong>{{ class_name }}</strong> for the academic year <strong>{{ academic_year }}</strong>.</p>
            <p>His/Her date of birth as per our school records is <strong>{{ student.dob }}</strong>.</p>
            <p>To the best of our knowledge, he/she bears a good moral character.</p>
        </div>
        <div class="footer">
            <div>Date: <strong>{{ issue_date }}</strong></div>
            <div>Principal's Signature & Seal</div>
        </div>
    </body>
    </html>
    """,
}

env = Environment(loader=DictLoader(TEMPLATES), autoescape=select_autoescape())


def generate_pdf(template_name: str, context: dict) -> bytes:
    """
    Generates a PDF from a Jinja template and context data using WeasyPrint.

    WeasyPrint is imported lazily so that a missing native dependency (libgobject/
    pango/cairo) degrades only PDF endpoints instead of crashing the whole API at
    import time.
    """
    template = env.get_template(template_name)
    html_out = template.render(**context)

    try:
        from weasyprint import HTML
    except OSError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="PDF generation is unavailable on this server (WeasyPrint native libraries are not installed).",
        ) from e

    # Generate PDF in memory
    pdf_bytes = HTML(string=html_out).write_pdf()
    return pdf_bytes
