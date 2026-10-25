from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.domain.errors import EmailAlreadyRegistered
from app.models import User


class UserRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def add(self, user: User) -> User:
        self.session.add(user)
        try:
            self.session.commit()
        except IntegrityError as exc:
            # The unique email constraint catches a sign-up that raced past the existence check.
            self.session.rollback()
            raise EmailAlreadyRegistered(user.email) from exc
        return user

    def get_by_email(self, email: str) -> User | None:
        return self.session.scalars(select(User).where(User.email == email)).first()

    def get_by_id(self, user_id: int) -> User | None:
        return self.session.get(User, user_id)
