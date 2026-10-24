from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db import get_session
from app.repositories.user import UserRepository
from app.schemas.auth import RegisterRequest, UserResponse
from app.services.auth import AuthService

router = APIRouter(prefix="/auth")


def get_auth_service(session: Annotated[Session, Depends(get_session)]) -> AuthService:
    return AuthService(UserRepository(session))


@router.post("/register", status_code=status.HTTP_201_CREATED, response_model=UserResponse)
def register(
    payload: RegisterRequest, service: Annotated[AuthService, Depends(get_auth_service)]
) -> UserResponse:
    user = service.register(payload.email, payload.password)
    return UserResponse.model_validate(user)
