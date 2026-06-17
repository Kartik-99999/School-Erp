import pytest

from app.crud.crud_exams import crud_result

# CBSE-style boundaries (subset) used by process_results' default scale.
RULES = [
    {"min": 91, "max": 100, "grade": "A1"},
    {"min": 81, "max": 90, "grade": "A2"},
    {"min": 33, "max": 40, "grade": "D"},
    {"min": 0, "max": 32, "grade": "E"},
]


@pytest.mark.parametrize(
    "pct,grade",
    [
        (100, "A1"),
        (95, "A1"),
        (91, "A1"),  # upper + lower boundary of A1
        (90, "A2"),
        (81, "A2"),
        (40, "D"),
        (33, "D"),
        (32, "E"),
        (0, "E"),
    ],
)
def test_calculate_grade_boundaries(pct, grade):
    assert crud_result.calculate_grade(pct, RULES) == grade


def test_calculate_grade_uncovered_range_is_fail():
    # 41–80 isn't covered by RULES → falls through to "Fail".
    assert crud_result.calculate_grade(55, RULES) == "Fail"
