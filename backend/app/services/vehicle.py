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

    def update(
        self, vehicle_id: int, make: str, model: str, category: str, price: Decimal
    ) -> Vehicle:
        vehicle = self.vehicles.get(vehicle_id)
        assert vehicle is not None
        vehicle.make = make
        vehicle.model = model
        vehicle.category = category
        vehicle.price = price
        return self.vehicles.save(vehicle)

    def list_all(self, limit: int, offset: int) -> list[Vehicle]:
        return self.vehicles.list_all(limit=limit, offset=offset)
