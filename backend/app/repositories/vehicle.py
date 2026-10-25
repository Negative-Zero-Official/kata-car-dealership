from sqlalchemy import select, update
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

    def try_decrement(self, vehicle_id: int, amount: int) -> bool:
        # Check and subtract in one statement; see docs/adr/0001-atomic-stock-decrement.md.
        result = self.session.execute(
            update(Vehicle)
            .where(Vehicle.id == vehicle_id, Vehicle.quantity >= amount)
            .values(quantity=Vehicle.quantity - amount)
        )
        self.session.commit()
        return result.rowcount == 1

    def increment(self, vehicle_id: int, amount: int) -> None:
        # Add in one statement; see docs/adr/0001-atomic-stock-decrement.md.
        self.session.execute(
            update(Vehicle)
            .where(Vehicle.id == vehicle_id)
            .values(quantity=Vehicle.quantity + amount)
        )
        self.session.commit()

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
        if criteria.min_price is not None:
            query = query.where(Vehicle.price >= criteria.min_price)
        if criteria.max_price is not None:
            query = query.where(Vehicle.price <= criteria.max_price)
        return list(self.session.scalars(query))
