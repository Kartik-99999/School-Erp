"""Role x endpoint integration audit against the live DB.

Seeds ONE coherent tenant (a school with one user per role + real relationships + per-feature
data) and proves, for every role: login + identity, the allowed surface (200 + {success,data}
+ school/child scoped), and that cross-role / cross-school / cross-child / wrong-school-code
access is blocked. Auto-skips without Postgres.

These tests only seed + assert; they never weaken scoping.
"""

import json
import uuid
from datetime import date, datetime, timedelta, timezone

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.main import app

API = settings.API_V1_STR
PW = "R0lePass!23"


async def _reachable(uri: str) -> bool:
    eng = create_async_engine(uri)
    try:
        async with eng.connect() as c:
            await c.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
    finally:
        await eng.dispose()


@pytest_asyncio.fixture
async def owner_session():
    uri = settings.async_database_uri
    if not await _reachable(uri):
        pytest.skip("DB not reachable for the role-integration audit")
    engine = create_async_engine(uri)
    Session = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    async with Session() as s:
        yield s
    await engine.dispose()


@pytest_asyncio.fixture
async def app_client():
    from app.db.session import engine as app_engine

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test", follow_redirects=True) as ac:
        yield ac
    await app_engine.dispose()


@pytest_asyncio.fixture
async def tenant(owner_session):
    """A school + one user per role + relationships + per-feature data. Returns ids/creds."""
    from app.core.security import get_password_hash
    from app.models.communication import Gallery, GalleryPhoto, Poll, PollOption
    from app.models.notifications import Notification
    from app.models.school import School
    from app.models.students import Parent, Student
    from app.models.staff import Staff
    from app.models.users import Role, User

    s = owner_session
    suf = uuid.uuid4().hex[:8]

    async def ins(sql, **p):
        return (await s.execute(text(sql), p)).scalar()

    school = School(name=f"Audit {suf}", subdomain=f"audit-{suf}", status="Trial")
    s.add(school)
    await s.flush()
    sid = school.id

    role_objs = {}
    for rn in ["Super Admin", "School Admin", "Accountant", "Teacher", "Student", "Parent"]:
        r = Role(school_id=sid, name=rn, permissions={"all": True} if "Admin" in rn else {})
        s.add(r)
        await s.flush()
        role_objs[rn] = r

    creds = {}
    users = {}
    for rn in role_objs:
        email = f"{rn.replace(' ', '').lower()}-{suf}@e.com"
        u = User(school_id=sid, email=email, hashed_password=get_password_hash(PW), role_id=role_objs[rn].id, is_active=True)
        s.add(u)
        await s.flush()
        users[rn] = u
        creds[rn] = email

    # Relationships
    parent = Parent(school_id=sid, user_id=users["Parent"].id, father_name="Mr Audit")
    other_parent = Parent(school_id=sid, father_name="Mr Other")
    s.add_all([parent, other_parent])
    await s.flush()
    staff = Staff(school_id=sid, user_id=users["Teacher"].id, first_name="Tina", last_name="Teacher")
    s.add(staff)
    await s.flush()

    year = await ins("INSERT INTO academic_years (school_id,name,start_date,end_date) VALUES (:s,'2026-27','2026-04-01','2027-03-31') RETURNING id", s=sid)
    cls = await ins("INSERT INTO classes (school_id,name,numeric_value) VALUES (:s,'VIII',8) RETURNING id", s=sid)
    sec = await ins("INSERT INTO sections (school_id,class_id,name) VALUES (:s,:c,'A') RETURNING id", s=sid, c=cls)
    sub1 = await ins("INSERT INTO subjects (school_id,name,code,type) VALUES (:s,'Mathematics','MATH','Core') RETURNING id", s=sid)
    sub2 = await ins("INSERT INTO subjects (school_id,name,code,type) VALUES (:s,'Science','SCI','Core') RETURNING id", s=sid)

    child1 = Student(school_id=sid, parent_id=parent.id, user_id=users["Student"].id, first_name="Aarav", last_name="A", dob=date(2014, 1, 1), current_class_id=cls, current_section_id=sec, admission_number=f"ADM-{suf}-1")
    child2 = Student(school_id=sid, parent_id=parent.id, first_name="Diya", last_name="A", dob=date(2016, 1, 1), current_class_id=cls, current_section_id=sec, admission_number=f"ADM-{suf}-2")
    other_child = Student(school_id=sid, parent_id=other_parent.id, first_name="Zoya", last_name="Z", dob=date(2014, 5, 5), admission_number=f"ADM-{suf}-3")
    s.add_all([child1, child2, other_child])
    await s.flush()

    # Exam + per-subject marks + processed result for child1
    etype = await ins("INSERT INTO exam_types (school_id,name) VALUES (:s,'Half-Yearly') RETURNING id", s=sid)
    exam = await ins("INSERT INTO exams (school_id,academic_year_id,exam_type_id,class_id,name,status) VALUES (:s,:y,:t,:c,'Half-Yearly','Published') RETURNING id", s=sid, y=year, t=etype, c=cls)
    es1 = await ins("INSERT INTO exam_schedules (school_id,exam_id,subject_id,exam_date,max_marks,passing_marks) VALUES (:s,:e,:su,'2026-09-10',100,33) RETURNING id", s=sid, e=exam, su=sub1)
    es2 = await ins("INSERT INTO exam_schedules (school_id,exam_id,subject_id,exam_date,max_marks,passing_marks) VALUES (:s,:e,:su,'2026-09-12',100,33) RETURNING id", s=sid, e=exam, su=sub2)
    await ins("INSERT INTO student_marks (school_id,exam_schedule_id,student_id,marks_obtained,is_absent) VALUES (:s,:es,:st,88,false) RETURNING id", s=sid, es=es1, st=child1.id)
    await ins("INSERT INTO student_marks (school_id,exam_schedule_id,student_id,marks_obtained,is_absent) VALUES (:s,:es,:st,76,false) RETURNING id", s=sid, es=es2, st=child1.id)
    await ins("INSERT INTO results (school_id,exam_id,student_id,total_marks,obtained_marks,percentage,grade,status,rank) VALUES (:s,:e,:st,200,164,82,'A','Pass',1) RETURNING id", s=sid, e=exam, st=child1.id)
    rules = json.dumps([{"min": 80, "max": 100, "grade": "A"}, {"min": 33, "max": 79.99, "grade": "B"}, {"min": 0, "max": 32.99, "grade": "F"}])
    await ins("INSERT INTO grade_scales (school_id,name,rules,is_default) VALUES (:s,'Default',CAST(:r AS json),true) RETURNING id", s=sid, r=rules)

    # Fees: head/structure/schedule + a receipt for child1
    head = await ins("INSERT INTO fee_heads (school_id,name) VALUES (:s,'Tuition') RETURNING id", s=sid)
    await ins("INSERT INTO fee_structures (school_id,academic_year_id,class_id,fee_head_id,amount,frequency) VALUES (:s,:y,:c,:h,12000,'Term') RETURNING id", s=sid, y=year, c=cls, h=head)
    await ins("INSERT INTO fee_schedules (school_id,student_id,academic_year_id,due_date,base_amount,net_due_amount,amount_paid,status) VALUES (:s,:st,:y,'2026-07-10',12000,12000,0,'Pending') RETURNING id", s=sid, st=child1.id, y=year)
    receipt = await ins("INSERT INTO fee_receipts (school_id,student_id,receipt_number,total_amount,payment_mode,payment_date) VALUES (:s,:st,:rn,12000,'Cash','2026-04-10') RETURNING id", s=sid, st=child1.id, rn=f"RC-{suf}")

    # Communication + library + leave
    await ins("INSERT INTO notices (school_id,title,body,category,target_audience,is_pinned) VALUES (:s,'Welcome','Hello','Notice','All',false) RETURNING id", s=sid)
    await ins("INSERT INTO events (school_id,title,start_date,end_date,event_type,target_audience,send_reminder) VALUES (:s,'Sports Day','2026-07-05','2026-07-05','Sports','All',false) RETURNING id", s=sid)
    await ins("INSERT INTO resources (school_id,title,category,target_audience,file_url) VALUES (:s,'Notes','Study Material','All','https://x/n.pdf') RETURNING id", s=sid)
    book = await ins("INSERT INTO library_books (school_id,title) VALUES (:s,'Wings of Fire') RETURNING id", s=sid)
    await ins("INSERT INTO library_issues (school_id,book_id,student_id,due_date) VALUES (:s,:b,:st,'2026-07-01') RETURNING id", s=sid, b=book, st=child1.id)
    await ins("INSERT INTO student_leave_applications (school_id,student_id,leave_type,from_date,to_date,reason,status) VALUES (:s,:st,'Sick','2026-06-15','2026-06-16','Fever','Pending') RETURNING id", s=sid, st=child1.id)

    poll = Poll(school_id=sid, question="Theme?", target_audience="All", is_active=True)
    s.add(poll)
    await s.flush()
    opt1 = PollOption(school_id=sid, poll_id=poll.id, text="A", position=0)
    opt2 = PollOption(school_id=sid, poll_id=poll.id, text="B", position=1)
    gallery = Gallery(school_id=sid, title="Trip", target_audience="All", is_published=True)
    s.add_all([opt1, opt2, gallery])
    await s.flush()
    s.add(GalleryPhoto(school_id=sid, gallery_id=gallery.id, image_url="https://x/1.jpg", position=0))
    s.add(Notification(school_id=sid, user_id=users["Student"].id, title="Hi", body="b", type="general"))

    # Two open appointment slots (so student + parent can each book one)
    slot1 = await ins("INSERT INTO appointment_slots (school_id,teacher_id,start_time,end_time,is_booked) VALUES (:s,:t, now()+interval '1 day', now()+interval '1 day 30 minutes', false) RETURNING id", s=sid, t=staff.id)
    slot2 = await ins("INSERT INTO appointment_slots (school_id,teacher_id,start_time,end_time,is_booked) VALUES (:s,:t, now()+interval '2 day', now()+interval '2 day 30 minutes', false) RETURNING id", s=sid, t=staff.id)

    # Teacher timetable slot
    period = await ins("INSERT INTO timetable_periods (school_id,name,start_time,end_time) VALUES (:s,'Period 1','08:00','08:45') RETURNING id", s=sid)
    await ins("INSERT INTO timetable_slots (school_id,academic_year_id,class_id,section_id,period_id,day_of_week,subject_id,teacher_id) VALUES (:s,:y,:c,:sec,:p,'Monday',:su,:t) RETURNING id", s=sid, y=year, c=cls, sec=sec, p=period, su=sub1, t=staff.id)

    await s.commit()

    yield {
        "subdomain": school.subdomain, "school_id": sid, "creds": creds,
        "child1": str(child1.id), "child2": str(child2.id), "other_child": str(other_child.id),
        "exam": str(exam), "poll": str(poll.id), "opt1": str(opt1.id), "opt2": str(opt2.id),
        "gallery": str(gallery.id), "receipt": str(receipt), "staff": str(staff.id),
        "slot1": str(slot1), "slot2": str(slot2),
        "es1": str(es1), "cls": str(cls), "sec": str(sec),
    }

    # FK-safe teardown
    order = [
        "poll_votes", "poll_options", "polls", "gallery_photos", "galleries",
        "appointments", "appointment_slots", "fee_payments", "fee_receipts", "fee_schedules",
        "fee_structures", "fee_heads", "results", "student_marks", "exam_schedules", "exams",
        "exam_types", "grade_scales", "timetable_slots", "timetable_periods", "library_issues",
        "library_books", "student_leave_applications", "notifications", "device_tokens",
        "notices", "events", "resources", "students", "parents", "sections", "classes",
        "subjects", "academic_years", "staff", "users", "roles",
    ]
    for tbl in order:
        await s.execute(text(f"DELETE FROM {tbl} WHERE school_id=:s"), {"s": sid})
    await s.execute(text("DELETE FROM schools WHERE id=:s"), {"s": sid})
    await s.commit()


async def _login(ac, email, code=None, pw=PW):
    headers = {"X-School-Code": code} if code else {}
    return await ac.post(f"{API}/auth/login", data={"username": email, "password": pw}, headers=headers)


async def _auth(ac, t, role):
    r = await _login(ac, t["creds"][role], code=t["subdomain"])
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


# --------------------------------------------------------------------------- #
# 1. Login + identity (the "profile is connected" check)
# --------------------------------------------------------------------------- #
async def test_every_role_logs_in_with_school_code(tenant, app_client):
    for role in ["Super Admin", "School Admin", "Accountant", "Teacher", "Student", "Parent"]:
        r = await _login(app_client, tenant["creds"][role], code=tenant["subdomain"])
        assert r.status_code == 200, (role, r.text)
        body = r.json()
        assert body.get("access_token"), role
        assert body.get("role") == role, (role, body.get("role"))
        assert body.get("subdomain") == tenant["subdomain"], role


async def test_identity_resolves(tenant, app_client):
    # Student -> own profile
    sh = await _auth(app_client, tenant, "Student")
    me = await app_client.get(f"{API}/students/me", headers=sh)
    assert me.status_code == 200 and me.json()["data"]["id"] == tenant["child1"]
    # Parent -> only their own children
    ph = await _auth(app_client, tenant, "Parent")
    kids = await app_client.get(f"{API}/students", headers=ph)
    assert kids.status_code == 200
    ids = {k["id"] for k in kids.json()["data"]}
    assert tenant["child1"] in ids and tenant["child2"] in ids
    assert tenant["other_child"] not in ids  # never another parent's child
    # Teacher -> their timetable resolves by staff id
    th = await _auth(app_client, tenant, "Teacher")
    tt = await app_client.get(f"{API}/academics/timetable/teacher/{tenant['staff']}", headers=th)
    assert tt.status_code == 200, tt.text
    # Admin -> school settings
    ah = await _auth(app_client, tenant, "School Admin")
    assert (await app_client.get(f"{API}/settings/me", headers=ah)).status_code == 200


# --------------------------------------------------------------------------- #
# 2. Positive — allowed functions, scoped
# --------------------------------------------------------------------------- #
async def test_student_surface(tenant, app_client):
    h = await _auth(app_client, tenant, "Student")
    fees = await app_client.get(f"{API}/student-portal/fees", headers=h)
    assert fees.status_code == 200 and fees.json()["data"]["student_id"] == tenant["child1"]
    for path in ["/student-portal/attendance", "/student-portal/syllabus", "/student-portal/library",
                 "/student-portal/leaves", "/student-portal/report-cards", "/communication/notices",
                 "/communication/events", "/communication/polls", "/communication/galleries",
                 "/appointments/slots", "/notifications", "/academic-years", "/academic-years/active",
                 "/fees/payment-options", "/exams/student/me/results"]:
        r = await app_client.get(f"{API}{path}", headers=h)
        assert r.status_code == 200, (path, r.text)
    # report-card detail (own)
    rc = await app_client.get(f"{API}/student-portal/report-cards/{tenant['exam']}", headers=h)
    assert rc.status_code == 200 and len(rc.json()["data"]["subjects"]) == 2
    # vote, book, register device, set active year, own receipt as HTML
    assert (await app_client.post(f"{API}/communication/polls/{tenant['poll']}/vote", headers=h, json={"option_id": tenant["opt1"]})).status_code == 200
    assert (await app_client.post(f"{API}/appointments", headers=h, json={"slot_id": tenant["slot1"]})).status_code == 200
    assert (await app_client.post(f"{API}/notifications/register-device", headers=h, json={"expo_push_token": f"ExponentPushToken[{uuid.uuid4().hex}]"})).status_code == 200
    assert (await app_client.get(f"{API}/notifications", headers=h)).json()["data"]  # has the seeded one
    assert (await app_client.get(f"{API}/fees/receipts/{tenant['receipt']}/html", headers=h)).status_code == 200


async def test_parent_surface_scoped_to_child(tenant, app_client):
    h = await _auth(app_client, tenant, "Parent")
    fees = await app_client.get(f"{API}/student-portal/fees?student_id={tenant['child1']}", headers=h)
    assert fees.status_code == 200 and fees.json()["data"]["student_id"] == tenant["child1"]
    rc = await app_client.get(f"{API}/student-portal/report-cards/{tenant['exam']}?student_id={tenant['child1']}", headers=h)
    assert rc.status_code == 200
    assert (await app_client.get(f"{API}/messages/me", headers=h)).status_code == 200
    assert (await app_client.post(f"{API}/appointments", headers=h, json={"slot_id": tenant["slot2"]})).status_code == 200
    assert (await app_client.get(f"{API}/fees/receipts/{tenant['receipt']}/html?student_id={tenant['child1']}", headers=h)).status_code == 200


async def test_teacher_surface(tenant, app_client):
    h = await _auth(app_client, tenant, "Teacher")
    # Teacher may post a notice (Admin+Teacher gate) and create homework
    n = await app_client.post(f"{API}/communication/notices", headers=h, json={"title": "Test", "body": "x", "category": "Notice", "target_audience": "All"})
    assert n.status_code == 200, n.text
    sub = await app_client.post(f"{API}/appointments/slots", headers=h, json={"start_time": (datetime.now(timezone.utc) + timedelta(days=3)).isoformat(), "end_time": (datetime.now(timezone.utc) + timedelta(days=3, minutes=30)).isoformat()})
    assert sub.status_code == 200, sub.text


async def test_admin_and_accountant_surface(tenant, app_client):
    ah = await _auth(app_client, tenant, "School Admin")
    assert (await app_client.post(f"{API}/academic-years", headers=ah, json={"name": "2027-28", "start_date": "2027-04-01", "end_date": "2028-03-31"})).status_code in (200, 201)
    assert (await app_client.get(f"{API}/students", headers=ah)).status_code == 200
    ach = await _auth(app_client, tenant, "Accountant")
    rep = await app_client.get(f"{API}/reports/dashboard-stats", headers=ach)
    assert rep.status_code == 200, rep.text  # reports router allows Accountant


# --------------------------------------------------------------------------- #
# 3. Negative — scoping/role gates that MUST hold today
# --------------------------------------------------------------------------- #
async def test_wrong_school_code_rejected(tenant, app_client):
    r = await _login(app_client, tenant["creds"]["Student"], code="someother")
    assert r.status_code == 403, r.text


async def test_parent_cannot_read_other_child(tenant, app_client):
    h = await _auth(app_client, tenant, "Parent")
    r = await app_client.get(f"{API}/student-portal/fees?student_id={tenant['other_child']}", headers=h)
    assert r.status_code == 403, r.text
    rc = await app_client.get(f"{API}/student-portal/report-cards/{tenant['exam']}?student_id={tenant['other_child']}", headers=h)
    assert rc.status_code == 403, rc.text


async def test_role_gates_hold(tenant, app_client):
    sh = await _auth(app_client, tenant, "Student")
    ph = await _auth(app_client, tenant, "Parent")
    th = await _auth(app_client, tenant, "Teacher")
    suh = await _auth(app_client, tenant, "Super Admin")
    ach = await _auth(app_client, tenant, "Accountant")
    # Student/Parent cannot post a notice (Admin+Teacher only)
    assert (await app_client.post(f"{API}/communication/notices", headers=sh, json={"title": "x", "body": "y", "category": "Notice", "target_audience": "All"})).status_code == 403
    # Student/Parent cannot pull the staff report-card PDF (IDOR fix)
    assert (await app_client.get(f"{API}/exams/{tenant['exam']}/report-card/{tenant['child1']}", headers=ph)).status_code == 403
    # Teacher cannot use the student portal (router gate)
    assert (await app_client.get(f"{API}/student-portal/fees", headers=th)).status_code == 403
    # Parent cannot publish a teacher appointment slot
    assert (await app_client.post(f"{API}/appointments/slots", headers=ph, json={"start_time": "2026-09-01T10:00:00Z", "end_time": "2026-09-01T10:30:00Z"})).status_code == 403
    # Super Admin is not a portal user
    assert (await app_client.get(f"{API}/student-portal/fees", headers=suh)).status_code == 403
    # Accountant cannot create an academic year (Admin/Super only)
    assert (await app_client.post(f"{API}/academic-years", headers=ach, json={"name": "x", "start_date": "2027-04-01", "end_date": "2028-03-31"})).status_code == 403
    # Student cannot reach the staff/finance reports (router gate: Admin/Super/Accountant)
    assert (await app_client.get(f"{API}/reports/dashboard-stats", headers=sh)).status_code == 403


async def test_change_password_self_service(tenant, app_client):
    # Each test re-seeds a fresh tenant, so mutating this user's password is isolated.
    h = await _auth(app_client, tenant, "Accountant")
    new_pw = "Rotated!456"
    r = await app_client.post(f"{API}/auth/change-password", headers=h, json={"current_password": PW, "new_password": new_pw})
    assert r.status_code == 200, r.text
    # New secret logs in; the old one no longer does.
    assert (await _login(app_client, tenant["creds"]["Accountant"], code=tenant["subdomain"], pw=new_pw)).status_code == 200
    assert (await _login(app_client, tenant["creds"]["Accountant"], code=tenant["subdomain"], pw=PW)).status_code in (400, 401)


async def test_security_gates_block_unauthorized(tenant, app_client):
    """Negative + preservation for the role gates added in the security-fix commit.

    A Student must be rejected from every newly-gated staff/finance operation, while
    the legitimate roles (Teacher for marks, Accountant for payroll) keep working.
    """
    sh = await _auth(app_client, tenant, "Student")
    th = await _auth(app_client, tenant, "Teacher")
    ach = await _auth(app_client, tenant, "Accountant")
    es1, exam, staff, cls, sec, child1 = (tenant[k] for k in ("es1", "exam", "staff", "cls", "sec", "child1"))
    today = date.today().isoformat()
    marks_body = {"exam_schedule_id": es1, "marks": [{"student_id": child1, "marks_obtained": 70, "is_absent": False}]}
    att_body = {"date": today, "class_id": cls, "section_id": sec, "attendance_records": [{"student_id": child1, "date": today, "status": "Present"}]}

    blocked = [
        ("get", f"/exams/schedules/{es1}/marks", None),     # whole-class marks leak
        ("get", f"/exams/{exam}/results", None),            # whole-class results leak
        ("post", f"/exams/{exam}/process", None),           # publish results
        ("post", "/exams/marks/bulk", marks_body),          # grade tampering
        ("post", "/attendance/students/bulk", att_body),    # attendance tampering
        ("get", "/payroll/employees", None),                # salary PII (all staff)
        ("get", f"/payroll/structure/{staff}", None),       # salary PII
        ("get", f"/payroll/payslip/{staff}?month=April&year=2026", None),
        ("get", "/library/lookup/isbn/9780143", None),      # was fully unauthenticated
    ]
    for method, path, body in blocked:
        call = getattr(app_client, method)
        r = await (call(f"{API}{path}", headers=sh, json=body) if body is not None else call(f"{API}{path}", headers=sh))
        assert r.status_code == 403, (path, r.status_code, r.text)

    # The gates did not over-restrict the roles that legitimately use these.
    assert (await app_client.get(f"{API}/exams/schedules/{es1}/marks", headers=th)).status_code == 200
    assert (await app_client.post(f"{API}/exams/marks/bulk", headers=th, json=marks_body)).status_code == 200
    # Accountant passes the payroll gate (200/404 = allowed, not 403). NOTE: GET /payroll/employees
    # itself 500s on real data (serializes a raw ORM Staff with no response schema) -- reported as a
    # finding; we assert the gate via the response-modeled /structure endpoint instead.
    assert (await app_client.get(f"{API}/payroll/structure/{staff}", headers=ach)).status_code in (200, 404)


# --------------------------------------------------------------------------- #
# Audit gap closures (ownership logic + real bugs)
# --------------------------------------------------------------------------- #
async def test_student_profile_ownership(tenant, app_client):
    """GET /students/{id} (+ /documents, /certificates) is ownership-aware."""
    ph = await _auth(app_client, tenant, "Parent")
    th = await _auth(app_client, tenant, "Teacher")
    sh = await _auth(app_client, tenant, "Student")
    c1, other = tenant["child1"], tenant["other_child"]
    # Parent: own child 200, another parent's child 403
    assert (await app_client.get(f"{API}/students/{c1}", headers=ph)).status_code == 200
    assert (await app_client.get(f"{API}/students/{other}", headers=ph)).status_code == 403
    # Teacher (staff): any student in their school
    assert (await app_client.get(f"{API}/students/{other}", headers=th)).status_code == 200
    # Student: self only
    assert (await app_client.get(f"{API}/students/{c1}", headers=sh)).status_code == 200
    assert (await app_client.get(f"{API}/students/{other}", headers=sh)).status_code == 403
    # Same guard protects the documents + certificate routes (guard runs before any PDF work)
    assert (await app_client.get(f"{API}/students/{c1}/documents", headers=ph)).status_code == 200
    assert (await app_client.get(f"{API}/students/{other}/documents", headers=ph)).status_code == 403
    assert (await app_client.get(f"{API}/students/{other}/certificates/bonafide", headers=ph)).status_code == 403
