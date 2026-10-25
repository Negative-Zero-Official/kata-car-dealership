from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Vehicle


class VehicleRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def add(self, vehicle: Vehicle) -> Vehicle:
        self.session.add(vehicle)
        self.session.commit()
        return vehicle

    def get(self, vehicle_id: int) -> Vehicle | None:
        return self.session.get(Vehicle, vehicle_id)

    def save(self, vehicle: Vehicle) -> Vehicle:
        self.session.commit()
        return vehicle

    def list_all(self, limit: int, offset: int) -> list[Vehicle]:
        query = select(Vehicle).order_by(Vehicle.id).limit(limit).offset(offset)
        return list(self.session.scalars(query))
