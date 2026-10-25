from dataclasses import dataclass


@dataclass(frozen=True)
class VehicleFilter:
    make: str | None = None
    model: str | None = None
    category: str | None = None
