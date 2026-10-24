class DomainError(Exception):
    detail = "Domain rule violated"


class EmailAlreadyRegistered(DomainError):
    detail = "Email already registered"
