# archive/

Leftover one-off developer scratch files moved out of the repo root during a
cleanup. Nothing here is imported by the application or referenced by docs — kept
only for reference. Safe to delete.

- `find_*.py`, `*mocks*.py`, `wipe_fakes.py`, `fix_ts.py` — ad-hoc scripts used while
  scrubbing mock/fake data during earlier development.
- `scratch*.{patch,tsx}` — abandoned scratch patches/snippets.
- `test_convert.py`, `test_login.js` — manual smoke scripts (not part of the pytest suite).
- `backend/test_*.py` — manual backend probes (`test_db*.py`, `test_delete_class.py`,
  `test_periods_api.py`). The real test suite lives in `backend/tests/`.
