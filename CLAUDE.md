# Car Dealership kata — working agreement

Spec and phases: see `dev-plan.md`.

## TDD loop (strict red → green → refactor)
- **One behaviour per cycle.** Stop after each step (RED, GREEN, REFACTOR) and wait for me.
- **RED:** write ONLY tests. Do not touch production code (`backend/app`, `frontend/src` non-test files). Run them and show me the failing output, and confirm it fails for the expected reason (assertion, not import/syntax error — unless the missing symbol *is* the point).
- **GREEN:** the minimum production code to pass. Then run the FULL suite (backend and/or frontend as touched) and show the result.
- **REFACTOR:** only with everything green; no behaviour change; re-run the full suite.
- **Never edit, skip, xfail or delete an existing test to make it pass** — stop and ask me.
- No production code without a failing test that needs it.

## Export
- At the end of a task, when I ask to export, export the chat logs to `prompts/<date>-<time>.md` and add a link from `PROMPTS.md`

## Stack
- **Backend:** Python, FastAPI, SQLAlchemy 2.0 (typed `Mapped[]` style), SQLite via `DATABASE_URL`, PyJWT for tokens, pwdlib for password hashing, pytest (+ pytest-cov), ruff. Managed with `uv`.
- **Frontend:** Vite + React + TypeScript + Tailwind CSS v4, Vitest + React Testing Library.

## Architecture
- `routes` (thin: parse/validate, call a service, map to HTTP) → `services` (business rules: roles, stock never below zero) → `repositories` (all DB access). Routes never touch the session directly; services never build HTTP responses.
- **Money is `Decimal`** end to end (SQLAlchemy `Numeric(12, 2)`, Pydantic `Decimal`, serialised as string). Never `float`.
- Config via env vars (`DATABASE_URL`, `JWT_SECRET`, …); tests use a temporary SQLite DB, never the dev DB.
- Use Context7 (MCP) to check current library APIs before writing unfamiliar code.

## Commands (PowerShell)
Backend (run in `backend/`):
- `uv sync` — install
- `uv run pytest -q` — full suite
- `uv run pytest -q tests/path/test_x.py::test_name` — one test
- `uv run pytest --cov=app --cov-report=term-missing` — coverage
- `uv run ruff check --fix; uv run ruff format` — lint + format
- `uv run fastapi dev app/main.py` — dev server
- `$env:DATABASE_URL = "sqlite:///./dev.db"` — set DB for the session

Frontend (run in `frontend/`):
- `npm install`
- `npm test -- --run` — full suite once
- `npm run lint`
- `npm run dev`
