# Working agreement
- Strict TDD. In RED: write ONLY tests, run them, show me the failure. Do not touch src.
- In GREEN: the minimum code to pass. Run the FULL suite after.
- Never edit or delete an existing test to make it pass — stop and ask me.
- One behaviour per cycle. Stop after each phase and wait for me.
# Stack / commands
- backend: `uv run pytest -q`, `uv run pytest --cov=app`, `uv run ruff check --fix && uv run ruff format`
- frontend: `npm test`, `npm run lint`
# Conventions
- routes thin → services (rules) → repositories (DB). Money as Decimal/int cents, never float.