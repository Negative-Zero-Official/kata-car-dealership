from app.models import Vehicle
from app.repositories.vehicle import VehicleRepository


class InventoryService:
    def __init__(self, vehicles: VehicleRepository) -> None:
        self.vehicles = vehicles

    def purchase(self, vehicle_id: int, quantity: int) -> Vehicle:
        vehicle = self.vehicles.get(vehicle_id)
        assert vehicle is not None
        vehicle.quantity -= quantity
        return self.vehicles.save(vehicle)
