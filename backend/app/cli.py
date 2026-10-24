import argparse
import sys

from app import models  # noqa: F401  registers tables on Base.metadata
from app.core.config import Settings, get_settings
from app.core.security import PasswordHasher
from app.db import Base, make_engine, make_session_factory
from app.domain.errors import EmailBelongsToNonAdmin
from app.repositories.user import UserRepository
from app.services.auth import AuthService
from app.services.token import TokenService


def create_admin(settings: Settings) -> int:
    if not settings.ADMIN_EMAIL or not settings.ADMIN_PASSWORD:
        print("ADMIN_EMAIL and ADMIN_PASSWORD must be set", file=sys.stderr)
        return 1
    engine = make_engine(settings.DATABASE_URL)
    try:
        Base.metadata.create_all(engine)
        tokens = TokenService(
            settings.JWT_SECRET, settings.JWT_ALGORITHM, settings.JWT_EXPIRE_MINUTES
        )
        with make_session_factory(engine)() as session:
            auth = AuthService(UserRepository(session), PasswordHasher(), tokens)
            admin = auth.create_admin(settings.ADMIN_EMAIL, settings.ADMIN_PASSWORD)
    except EmailBelongsToNonAdmin as error:
        print(f"{settings.ADMIN_EMAIL}: {error.detail}", file=sys.stderr)
        return 1
    finally:
        engine.dispose()
    print(f"Admin ready: {admin.email}")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("create-admin", help="create the admin from ADMIN_EMAIL / ADMIN_PASSWORD")
    parser.parse_args(argv)
    return create_admin(get_settings())


if __name__ == "__main__":
    sys.exit(main())
