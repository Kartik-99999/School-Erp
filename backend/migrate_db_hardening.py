"""DB hardening: add hot foreign-key / tenant lookup indexes and the
fee_structures uniqueness guard to an EXISTING database. Idempotent and safe to
re-run — every statement uses IF NOT EXISTS and runs in its own transaction so a
missing optional table or a pre-existing duplicate can't abort the rest.

Run:  cd backend && PYTHONPATH=. ./venv/bin/python migrate_db_hardening.py
"""

import asyncio

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings

# Postgres does not auto-index foreign-key columns; these back the per-query
# school_id filters and the joins in the fees / exams / setup modules.
INDEXES = [
    "CREATE INDEX IF NOT EXISTS idx_students_current_class ON students(current_class_id)",
    "CREATE INDEX IF NOT EXISTS idx_students_parent ON students(parent_id)",
    "CREATE INDEX IF NOT EXISTS idx_classes_school ON classes(school_id)",
    "CREATE INDEX IF NOT EXISTS idx_sections_school ON sections(school_id)",
    "CREATE INDEX IF NOT EXISTS idx_sections_class ON sections(class_id)",
    "CREATE INDEX IF NOT EXISTS idx_subjects_school ON subjects(school_id)",
    "CREATE INDEX IF NOT EXISTS idx_class_subjects_class ON class_subjects(class_id)",
    "CREATE INDEX IF NOT EXISTS idx_class_subjects_subject ON class_subjects(subject_id)",
    "CREATE INDEX IF NOT EXISTS idx_academic_years_school ON academic_years(school_id)",
    "CREATE INDEX IF NOT EXISTS idx_fee_structures_school ON fee_structures(school_id)",
    "CREATE INDEX IF NOT EXISTS idx_fee_structures_class_year ON fee_structures(class_id, academic_year_id)",
    "CREATE INDEX IF NOT EXISTS idx_fee_schedules_school ON fee_schedules(school_id)",
    "CREATE INDEX IF NOT EXISTS idx_fee_schedules_structure ON fee_schedules(fee_structure_id)",
    "CREATE INDEX IF NOT EXISTS idx_fee_receipts_school ON fee_receipts(school_id)",
    "CREATE INDEX IF NOT EXISTS idx_fee_receipts_student ON fee_receipts(student_id)",
    "CREATE INDEX IF NOT EXISTS idx_fee_payments_receipt ON fee_payments(receipt_id)",
    "CREATE INDEX IF NOT EXISTS idx_fee_payments_schedule ON fee_payments(fee_schedule_id)",
    "CREATE INDEX IF NOT EXISTS idx_student_fee_concessions_student ON student_fee_concessions(student_id)",
    "CREATE INDEX IF NOT EXISTS idx_exam_schedules_exam ON exam_schedules(exam_id)",
    "CREATE INDEX IF NOT EXISTS idx_student_marks_student ON student_marks(student_id)",
    # results / grade_scales come from create_all, not schema.sql — index here too.
    "CREATE INDEX IF NOT EXISTS idx_results_exam ON results(exam_id)",
    "CREATE INDEX IF NOT EXISTS idx_results_student ON results(student_id)",
]

UNIQUE_FEE_STRUCTURE = (
    "CREATE UNIQUE INDEX IF NOT EXISTS uq_fee_structure_class_head_year "
    "ON fee_structures(school_id, class_id, fee_head_id, academic_year_id)"
)


async def _run(engine, sql: str) -> bool:
    """Execute one DDL statement in its own transaction; never raises."""
    try:
        async with engine.begin() as conn:
            await conn.execute(text(sql))
        return True
    except Exception as e:  # noqa: BLE001 — report and keep going
        print(f"  SKIP: {sql.split(' ON ')[0]}\n        -> {type(e).__name__}: {e}")
        return False


async def main() -> int:
    engine = create_async_engine(settings.async_database_uri)
    ok = 0
    print("Adding lookup indexes...")
    for sql in INDEXES:
        if await _run(engine, sql):
            ok += 1
    print(f"Indexes applied/verified: {ok}/{len(INDEXES)}")

    print("Adding fee_structures uniqueness guard...")
    unique_ok = await _run(engine, UNIQUE_FEE_STRUCTURE)
    if unique_ok:
        print("  uq_fee_structure_class_head_year is in place.")
    else:
        print(
            "  Could not create the unique index — duplicate (school_id, class_id, "
            "fee_head_id, academic_year_id) rows likely exist. De-duplicate "
            "fee_structures (keep the newest per key), then re-run this script."
        )

    await engine.dispose()

    # Every statement uses IF NOT EXISTS, so on a reachable DB it should apply or
    # no-op. Zero successes means the DB was unreachable / misconfigured — fail
    # loudly so a caller (CI, operator) doesn't mistake it for success.
    if ok == 0:
        print("DB hardening migration FAILED: no statements applied (database unreachable?).")
        return 1
    print("DB hardening migration complete.")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
