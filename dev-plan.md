# Development Plan

## 1. Scope

### Must have's

- Register and login. JWT bearer auth protecting every vehicle and inventory endpoint
- Vehicle CRUD, search (make, model, category, price range), purchase, restock
- Role rules: **delete and restock are admin-only**
- SPA with auth forms, vehicle dashboard, search/filter, Purchase button (disabled at zero stock), adn admin UI to add, update, and delete vehicles
- Visible red-green-refactor history
- README (setup, screenshots, test report, AI Usage) and PROMPTS.md

### Should have

- Pagination on the vehicle list, consistent error formate, `.env.example`, one-command test scripts
- Responsive and polished UI (loading, empty, error states, toast notifications, keyboard accessible controls)
- GitHub Actions workflow running test suites

### Could have

- Live deploy (Vercel)
- Alembic migrations
- Purchase history table

## 2. Main decisions

| Area | Decision |
| --- | --- |
| Backend | Python + FastAPI |
| Database | SQLite through SQLAlchemy (could make it Postgres swappable using `DATABASE_URL`) |
| Auth | JWT bearer tokens, hashed passwords |
| Roles | `user` and `admin`. (admins are created by a seed step) |
| Structure | Thin routes -> services (business rules) -> repositories (data access) |
| Stock safety | Purchase must never push stock below zero, event under concurrent requests |
| Frontend | Vite + React + TypeScript + Tailwind |
| Testing | pytest for the API, Vitest + React Testing Library for the UI |

## 3. Development approach

Work in thin vertical slices, each as red -> green -> refactor, committed separately.

1. Red: write a failing test and commit it alone
2. Green: make it pass with the least code, then commit
3. Refactor: tidy with tests green, then commit

No production code without a failing test that makes it necessary.

## 4. Phases

1. **Foundations**: Set up the repo, test harness and a temporary test database, and one smoke test
2. **Authentication**: Registration, login, token issuing and checking, and the "user" and "admin" gates. Cover bad credentials, duplicate emails, expired or tampered tokens, and role checks
3. **Vehicles**: CRUD with validation. Then search by make, model, category, and price range. Cover empty results, combined filters, and boundary prices.
4. **Inventory**: Purchase and restock rules, including sold out cases and invalid quantities
5. **Hardening**: Close coverage gaps, make errors consistent, read every file and remove anything unnecessary
6. **Frontend**: Auth forms, vehicle dashboard, search and filter, purchase with a disabled state at zero stock, and the admin tools.
7. **Wrap up**: README, screenshots, test report, prompt logs, fresh-clone check. (Maybe deploy if time permits)

## Things I want to explore before committing

- Where the search logic shoud live (query layer vs service)
- Whether to use migrations or create tables at startup
- How to store the token on the client, and the trade-offs
- Which UI layout feels th best for filters (sidebar vs drawer) and for admin actions (inline vs modal)
- Deployment options

## Checklist

- [x] All kata requirement work end-to-end (user flow and admin flow)
- [x] Tests pass with coverage report
- [ ] README: overview, setup for backend and frontend, screenshots, test report, AI usage
- [x] `PROMPTS.md`