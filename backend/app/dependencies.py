from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.security import PasswordHasher
from app.db import get_session
from app.repositories.user import UserRepository
from app.services.auth import AuthService


def get_auth_service(session: Annotated[Session, Depends(get_session)]) -> AuthService:
    return AuthService(UserRepository(session), PasswordHasher())
