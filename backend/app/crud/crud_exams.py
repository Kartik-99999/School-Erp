from typing import Dict, List
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.crud.base import CRUDBase
from app.models.exams import Exam, ExamSchedule, ExamType, GradeScale, Result, StudentMark
from app.models.students import Student
from app.schemas.exams import (
    StudentMarkBulkCreate,
)


class CRUDSimple(CRUDBase):
    pass


crud_grade_scale = CRUDSimple(GradeScale)
crud_exam_type = CRUDSimple(ExamType)
crud_exam = CRUDSimple(Exam)
crud_exam_schedule = CRUDSimple(ExamSchedule)


class CRUDStudentMark(CRUDBase[StudentMark, dict, dict]):
    async def bulk_upsert(
        self,
        db: AsyncSession,
        school_id: UUID,
        exam_schedule_id: UUID,
        marks_data: StudentMarkBulkCreate,
    ):
        # Fetch max marks
        schedule = (
            (await db.execute(select(ExamSchedule).filter(ExamSchedule.id == exam_schedule_id)))
            .scalars()
            .first()
        )
        if not schedule:
            raise ValueError("Exam schedule not found")

        # Fetch existing marks
        query = select(self.model).filter(
            self.model.school_id == school_id, self.model.exam_schedule_id == exam_schedule_id
        )
        existing_records = {str(r.student_id): r for r in (await db.execute(query)).scalars().all()}

        for mark_in in marks_data.marks:
            if mark_in.marks_obtained is not None and mark_in.marks_obtained > float(
                schedule.max_marks
            ):
                raise ValueError(
                    f"Marks obtained ({mark_in.marks_obtained}) cannot exceed maximum marks ({schedule.max_marks})"
                )
            if mark_in.marks_obtained is not None and mark_in.marks_obtained < 0:
                raise ValueError("Marks obtained cannot be negative")

            student_id_str = str(mark_in.student_id)
            if student_id_str in existing_records:
                record = existing_records[student_id_str]
                record.marks_obtained = mark_in.marks_obtained
                record.is_absent = mark_in.is_absent
                record.remarks = mark_in.remarks
                db.add(record)
            else:
                new_record = StudentMark(
                    school_id=school_id,
                    exam_schedule_id=exam_schedule_id,
                    student_id=mark_in.student_id,
                    marks_obtained=mark_in.marks_obtained,
                    is_absent=mark_in.is_absent,
                    remarks=mark_in.remarks,
                )
                db.add(new_record)

        await db.commit()


class CRUDResult(CRUDBase[Result, dict, dict]):
    def calculate_grade(self, percentage: float, rules: List[Dict]) -> str:
        for rule in rules:
            if rule["min"] <= percentage <= rule["max"]:
                return rule["grade"]
        return "Fail"

    async def process_results(self, db: AsyncSession, school_id: UUID, exam_id: UUID):
        # 1. Fetch Exam and Grade Scale
        exam = (
            (await db.execute(select(Exam).filter(Exam.id == exam_id, Exam.school_id == school_id)))
            .scalars()
            .first()
        )
        if not exam:
            raise ValueError("Exam not found")

        # Get active grade scale
        scale = (
            (
                await db.execute(
                    select(GradeScale).filter(
                        GradeScale.school_id == school_id, GradeScale.is_default == True
                    )
                )
            )
            .scalars()
            .first()
        )
        default_rules = [
            {"min": 91, "max": 100, "grade": "A1", "points": 10},
            {"min": 81, "max": 90, "grade": "A2", "points": 9},
            {"min": 71, "max": 80, "grade": "B1", "points": 8},
            {"min": 61, "max": 70, "grade": "B2", "points": 7},
            {"min": 51, "max": 60, "grade": "C1", "points": 6},
            {"min": 41, "max": 50, "grade": "C2", "points": 5},
            {"min": 33, "max": 40, "grade": "D", "points": 4},
            {"min": 0, "max": 32, "grade": "E", "points": 0},
        ]
        rules = scale.rules if scale and scale.rules else default_rules

        # 2. Fetch all schedules for this exam to get max marks per subject
        schedules = (
            (await db.execute(select(ExamSchedule).filter(ExamSchedule.exam_id == exam_id)))
            .scalars()
            .all()
        )
        if not schedules:
            return
        schedule_ids = [s.id for s in schedules]
        total_max_marks = sum(s.max_marks for s in schedules)

        # 3. Fetch all students in this class (tenant-scoped)
        students = (
            (
                await db.execute(
                    select(Student).filter(
                        Student.school_id == school_id,
                        Student.current_class_id == exam.class_id,
                    )
                )
            )
            .scalars()
            .all()
        )
        student_ids = [s.id for s in students]

        # Prefetch every mark for this exam's schedules in ONE query (grouped by
        # student) instead of a query per student.
        marks_by_student: Dict[UUID, list] = {}
        if student_ids:
            all_marks = (
                (
                    await db.execute(
                        select(StudentMark).filter(
                            StudentMark.student_id.in_(student_ids),
                            StudentMark.exam_schedule_id.in_(schedule_ids),
                        )
                    )
                )
                .scalars()
                .all()
            )
            for m in all_marks:
                marks_by_student.setdefault(m.student_id, []).append(m)

        # 4. Calculate for each student
        student_results = []
        for student in students:
            marks = marks_by_student.get(student.id, [])

            if not marks:
                continue  # Skip students with no marks entered

            obtained = sum(
                m.marks_obtained for m in marks if m.marks_obtained is not None and not m.is_absent
            )

            # Simple Pass/Fail logic: fail if any subject mark is below passing
            status = "Pass"
            for m in marks:
                if m.is_absent:
                    status = "Fail"
                    break
                sched = next((s for s in schedules if s.id == m.exam_schedule_id), None)
                if (
                    sched
                    and m.marks_obtained is not None
                    and m.marks_obtained < sched.passing_marks
                ):
                    status = "Fail"
                    break

            percentage = (
                float(obtained) / float(total_max_marks) * 100 if total_max_marks > 0 else 0
            )
            grade = self.calculate_grade(percentage, rules)

            student_results.append(
                {
                    "student_id": student.id,
                    "total_marks": total_max_marks,
                    "obtained_marks": obtained,
                    "percentage": round(percentage, 2),
                    "grade": grade,
                    "status": status,
                }
            )

        # 5. Rank Assignment
        student_results.sort(key=lambda x: x["percentage"], reverse=True)
        current_rank = 1
        for res in student_results:
            res["rank"] = current_rank
            current_rank += 1

        # 6. Upsert Results to DB
        existing_results = (
            (await db.execute(select(Result).filter(Result.exam_id == exam_id))).scalars().all()
        )
        existing_map = {str(r.student_id): r for r in existing_results}

        for res in student_results:
            student_id_str = str(res["student_id"])
            if student_id_str in existing_map:
                db_res = existing_map[student_id_str]
                db_res.total_marks = res["total_marks"]
                db_res.obtained_marks = res["obtained_marks"]
                db_res.percentage = res["percentage"]
                db_res.grade = res["grade"]
                db_res.status = res["status"]
                db_res.rank = res["rank"]
                db.add(db_res)
            else:
                new_res = Result(school_id=school_id, exam_id=exam_id, **res)
                db.add(new_res)

        # 7. Update exam status
        exam.status = "Published"
        db.add(exam)
        await db.commit()


crud_student_mark = CRUDStudentMark(StudentMark)
crud_result = CRUDResult(Result)
