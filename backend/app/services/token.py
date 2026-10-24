from datetime import UTC, datetime, timedelta

import jwt

from app.models import User

ALGORITHM = "HS256"


class TokenService:
    def __init__(self, secret: str, expire_minutes: int) -> None:
        self.secret = secret
        self.expire_minutes = expire_minutes

    def issue(self, user: User) -> str:
        payload = {
            "sub": str(user.id),
            "role": user.role,
            "exp": datetime.now(UTC) + timedelta(minutes=self.expire_minutes),
        }
        return jwt.encode(payload, self.secret, algorithm=ALGORITHM)
