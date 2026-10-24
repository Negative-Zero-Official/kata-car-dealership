from app.core.security import PasswordHasher
from app.models import User
from app.repositories.user import UserRepository


class EmailAlreadyRegistered(Exception):
    pass


class AuthService:
    def __init__(self, users: UserRepository, hasher: PasswordHasher) -> None:
        self.users = users
        self.hasher = hasher

    def register(self, email: str, password: str) -> User:
        email = email.lower()
        if self.users.get_by_email(email) is not None:
            raise EmailAlreadyRegistered(email)
        return self.users.add(
            User(email=email, hashed_password=self.hasher.hash(password), role="user")
        )
