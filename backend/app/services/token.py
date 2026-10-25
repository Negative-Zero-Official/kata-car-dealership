from datetime import UTC, datetime, timedelta

import jwt

from app.domain.errors import InvalidToken
from app.models import User


class TokenService:
    def __init__(self, secret: str, algorithm: str, expire_minutes: int) -> None:
        self.secret = secret
        self.algorithm = algorithm
        self.expire_minutes = expire_minutes

    def issue(self, user: User) -> str:
        payload = {
            "sub": str(user.id),
            "role": user.role,
            "exp": datetime.now(UTC) + timedelta(minutes=self.expire_minutes),
        }
        return jwt.encode(payload, self.secret, algorithm=self.algorithm)

    def user_id(self, token: str) -> int:
        try:
            payload = jwt.decode(
                token,
                self.secret,
                algorithms=[self.algorithm],
                options={"require": ["exp", "sub"]},
            )
            return int(payload["sub"])
        except (jwt.InvalidTokenError, ValueError) as exc:
            raise InvalidToken() from exc
