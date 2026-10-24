# Prompts

Log of AI-assisted sessions (Claude Code), one file per session in [`prompts/`](prompts/).

| Date | Session | Summary |
| --- | --- | --- |
| 2026-10-24 00:38 | [TDD kata environment setup](prompts/2026-10-24-0038.md) | Working agreement (`CLAUDE.md`), Context7 MCP config, `.gitignore` |
| 2026-10-24 17:53 | [Backend scaffold](prompts/2026-10-24-1753.md) | `uv` project in `backend/`: FastAPI, pytest, httpx, pytest-cov, ruff, empty app factory, `app`/`client` fixtures |
| 2026-10-24 18:14 | [Health endpoint (GREEN + REFACTOR)](prompts/2026-10-24-1814.md) | Minimal `GET /api/health` returning `{"status": "ok"}`, then moved into an `app/routes/health.py` router; suite 1 passed, ruff clean |
| 2026-10-24 21:04 | [DB and config foundation (chore)](prompts/2026-10-24-2104.md) | Added SQLAlchemy, pydantic-settings, PyJWT, pwdlib; `Settings`, `app/db.py`, lifespan table creation, per-test SQLite under `tmp_path`; options for engine placement, `JWT_SECRET` default, CORS |
| 2026-10-24 21:18 | [Register endpoint (RED + GREEN + REFACTOR)](prompts/2026-10-24-2118.md) | `POST /api/auth/register` → 201 `{id, email, role}`: `User` model, `UserRepository`, `AuthService.register`, auth schemas and route; provider moved to `app/dependencies.py`; suite 4 passed, ruff clean |
| 2026-10-24 21:42 | [Password hashing on register (GREEN)](prompts/2026-10-24-2142.md) | `PasswordHasher` wrapping pwdlib (argon2) in `app/core/security.py`, injected into `AuthService` via `get_auth_service`; register stores a verifiable hash; suite 5 passed, ruff clean |
