from app.models import User
from app.repositories.user import UserRepository


class AuthService:
    def __init__(self, users: UserRepository) -> None:
        self.users = users

    def register(self, email: str, password: str) -> User:
        return self.users.add(User(email=email, hashed_password=password, role="user"))
