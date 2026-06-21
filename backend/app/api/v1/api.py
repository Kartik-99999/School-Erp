from fastapi import APIRouter

from app.api.v1.endpoints import (
    academic_years,
    academics,
    activities,
    admissions,
    appointments,
    attendance,
    audit,
    auth,
    classes,
    communication,
    exams,
    fees,
    hostel,
    leaves,
    library,
    messaging,
    notifications,
    payroll,
    reports,
    resources,
    schools,
    settings,
    staff,
    student_portal,
    students,
    subjects,
    super_admin,
    transport,
    two_factor,
)

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(two_factor.router, prefix="/auth/2fa", tags=["2fa"])
api_router.include_router(classes.router, prefix="/classes", tags=["classes"])
api_router.include_router(subjects.router, prefix="/subjects", tags=["subjects"])
api_router.include_router(academic_years.router, prefix="/academic-years", tags=["academic-years"])
api_router.include_router(fees.router, prefix="/fees", tags=["fees"])
api_router.include_router(admissions.router, prefix="/admissions", tags=["admissions"])
api_router.include_router(students.router, prefix="/students", tags=["students"])
api_router.include_router(staff.router, prefix="/staff", tags=["staff"])
api_router.include_router(leaves.router, prefix="/leaves", tags=["leaves"])
api_router.include_router(payroll.router, prefix="/payroll", tags=["payroll"])
api_router.include_router(attendance.router, prefix="/attendance", tags=["attendance"])
api_router.include_router(appointments.router, prefix="/appointments", tags=["appointments"])
api_router.include_router(academics.router, prefix="/academics", tags=["academics"])
api_router.include_router(exams.router, prefix="/exams", tags=["exams"])
api_router.include_router(transport.router, prefix="/transport", tags=["transport"])
api_router.include_router(library.router, prefix="/library", tags=["library"])
api_router.include_router(hostel.router, prefix="/hostel", tags=["hostel"])
api_router.include_router(communication.router, prefix="/communication", tags=["communication"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(resources.router, prefix="/resources", tags=["resources"])
api_router.include_router(super_admin.router, prefix="/super-admin", tags=["super_admin"])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])
api_router.include_router(student_portal.router, prefix="/student-portal", tags=["student-portal"])
api_router.include_router(messaging.router, prefix="/messages", tags=["messaging"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(schools.router, prefix="/schools", tags=["schools"])
api_router.include_router(audit.router, prefix="/audit", tags=["audit"])
api_router.include_router(activities.router, prefix="/activities", tags=["activities"])
