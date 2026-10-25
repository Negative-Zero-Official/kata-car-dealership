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

    def list_all(self) -> list[Vehicle]:
        return list(self.session.scalars(select(Vehicle).order_by(Vehicle.id)))
