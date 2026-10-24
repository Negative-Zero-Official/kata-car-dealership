from pwdlib import PasswordHash


class PasswordHasher:
    def __init__(self) -> None:
        self._hash = PasswordHash.recommended()

    def hash(self, password: str) -> str:
        return self._hash.hash(password)

    def verify(self, password: str, hashed: str) -> bool:
        return self._hash.verify(password, hashed)
