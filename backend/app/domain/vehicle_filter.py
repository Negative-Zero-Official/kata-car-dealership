from dataclasses import dataclass
from decimal import Decimal


@dataclass(frozen=True)
class VehicleFilter:
    make: str | None = None
    model: str | None = None
    category: str | None = None
    min_price: Decimal | None = None
    max_price: Decimal | None = None
