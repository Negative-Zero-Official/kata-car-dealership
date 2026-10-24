from app.core.security import PasswordHasher
from app.domain.errors import EmailAlreadyRegistered, InvalidCredentials
from app.models import User
from app.repositories.user import UserRepository
from app.services.token import TokenService


class AuthService:
    def __init__(self, users: UserRepository, hasher: PasswordHasher, tokens: TokenService) -> None:
        self.users = users
        self.hasher = hasher
        self.tokens = tokens

    def register(self, email: str, password: str) -> User:
        email = email.lower()
        if self.users.get_by_email(email) is not None:
            raise EmailAlreadyRegistered(email)
        return self.users.add(
            User(email=email, hashed_password=self.hasher.hash(password), role="user")
        )

    def create_admin(self, email: str, password: str) -> User:
        existing = self.users.get_by_email(email)
        if existing is not None:
            return existing
        return self.users.add(
            User(email=email, hashed_password=self.hasher.hash(password), role="admin")
        )

    def login(self, email: str, password: str) -> tuple[str, User]:
        user = self.users.get_by_email(email.lower())
        if user is None or not self.hasher.verify(password, user.hashed_password):
            raise InvalidCredentials()
        return self.tokens.issue(user), user
