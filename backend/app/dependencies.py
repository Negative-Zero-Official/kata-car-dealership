from typing import Annotated

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.security import PasswordHasher
from app.db import get_session
from app.domain.errors import AdminRequired, InvalidToken
from app.models import User
from app.repositories.user import UserRepository
from app.services.auth import AuthService
from app.services.token import TokenService


def get_settings(request: Request) -> Settings:
    return request.app.state.settings


def get_token_service(settings: Annotated[Settings, Depends(get_settings)]) -> TokenService:
    return TokenService(settings.JWT_SECRET, settings.JWT_ALGORITHM, settings.JWT_EXPIRE_MINUTES)


def get_auth_service(
    session: Annotated[Session, Depends(get_session)],
    tokens: Annotated[TokenService, Depends(get_token_service)],
) -> AuthService:
    return AuthService(UserRepository(session), PasswordHasher(), tokens)


bearer = HTTPBearer()


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer)],
    session: Annotated[Session, Depends(get_session)],
    tokens: Annotated[TokenService, Depends(get_token_service)],
) -> User:
    user = UserRepository(session).get_by_id(tokens.user_id(credentials.credentials))
    if user is None:
        raise InvalidToken()
    return user


def require_admin(user: Annotated[User, Depends(get_current_user)]) -> User:
    if user.role != "admin":
        raise AdminRequired()
    return user
