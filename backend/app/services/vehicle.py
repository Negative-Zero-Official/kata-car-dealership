from decimal import Decimal

from app.models import Vehicle
from app.repositories.vehicle import VehicleRepository


class VehicleService:
    def __init__(self, vehicles: VehicleRepository) -> None:
        self.vehicles = vehicles

    def create(
        self, make: str, model: str, category: str, price: Decimal, quantity: int
    ) -> Vehicle:
        return self.vehicles.add(
            Vehicle(make=make, model=model, category=category, price=price, quantity=quantity)
        )
