from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.vehicle_filter import VehicleFilter
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

    def delete(self, vehicle: Vehicle) -> None:
        self.session.delete(vehicle)
        self.session.commit()

    def list_all(self, limit: int, offset: int) -> list[Vehicle]:
        query = select(Vehicle).order_by(Vehicle.id).limit(limit).offset(offset)
        return list(self.session.scalars(query))

    def search(self, criteria: VehicleFilter) -> list[Vehicle]:
        query = select(Vehicle).order_by(Vehicle.id)
        if criteria.make is not None:
            query = query.where(Vehicle.make.ilike(f"%{criteria.make}%"))
        if criteria.model is not None:
            query = query.where(Vehicle.model.ilike(f"%{criteria.model}%"))
        if criteria.category is not None:
            query = query.where(Vehicle.category.ilike(f"%{criteria.category}%"))
        return list(self.session.scalars(query))
