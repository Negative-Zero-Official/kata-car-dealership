from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.security import PasswordHasher
from app.db import get_session
from app.repositories.user import UserRepository
from app.services.auth import AuthService
from app.services.token import TokenService


def get_settings(request: Request) -> Settings:
    return request.app.state.settings


def get_token_service(settings: Annotated[Settings, Depends(get_settings)]) -> TokenService:
    return TokenService(settings.JWT_SECRET, settings.JWT_EXPIRE_MINUTES)


def get_auth_service(
    session: Annotated[Session, Depends(get_session)],
    tokens: Annotated[TokenService, Depends(get_token_service)],
) -> AuthService:
    return AuthService(UserRepository(session), PasswordHasher(), tokens)
