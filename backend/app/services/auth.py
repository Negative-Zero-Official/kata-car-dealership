from app.core.security import PasswordHasher
from app.models import User
from app.repositories.user import UserRepository


class AuthService:
    def __init__(self, users: UserRepository, hasher: PasswordHasher) -> None:
        self.users = users
        self.hasher = hasher

    def register(self, email: str, password: str) -> User:
        return self.users.add(
            User(email=email, hashed_password=self.hasher.hash(password), role="user")
        )
