from app.domain.errors import InsufficientStock, VehicleNotFound
from app.models import Vehicle
from app.repositories.vehicle import VehicleRepository


class InventoryService:
    def __init__(self, vehicles: VehicleRepository) -> None:
        self.vehicles = vehicles

    def purchase(self, vehicle_id: int, quantity: int) -> Vehicle:
        decremented = self.vehicles.try_decrement(vehicle_id, quantity)
        vehicle = self.vehicles.get(vehicle_id)
        if vehicle is None:
            raise VehicleNotFound
        if not decremented:
            raise InsufficientStock
        return vehicle
