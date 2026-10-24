from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.dependencies import get_auth_service
from app.schemas.auth import RegisterRequest, UserResponse
from app.services.auth import AuthService

router = APIRouter(prefix="/auth")


@router.post("/register", status_code=status.HTTP_201_CREATED, response_model=UserResponse)
def register(
    payload: RegisterRequest, service: Annotated[AuthService, Depends(get_auth_service)]
) -> UserResponse:
    user = service.register(payload.email, payload.password)
    return UserResponse.model_validate(user)
