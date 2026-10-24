from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

from app.domain.errors import (
    AdminRequired,
    DomainError,
    EmailAlreadyRegistered,
    InvalidCredentials,
    InvalidToken,
)

STATUS_BY_ERROR: dict[type[DomainError], int] = {
    EmailAlreadyRegistered: status.HTTP_409_CONFLICT,
    InvalidCredentials: status.HTTP_401_UNAUTHORIZED,
    InvalidToken: status.HTTP_401_UNAUTHORIZED,
    AdminRequired: status.HTTP_403_FORBIDDEN,
}


async def handle_domain_error(request: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, DomainError)
    return JSONResponse(status_code=STATUS_BY_ERROR[type(exc)], content={"detail": exc.detail})


def register_exception_handlers(app: FastAPI) -> None:
    for error in STATUS_BY_ERROR:
        app.add_exception_handler(error, handle_domain_error)
