from pydantic import BaseModel, ConfigDict

from app.schemas.money import Money


class VehicleBase(BaseModel):
    make: str
    model: str
    category: str
    price: Money
    quantity: int


class VehicleCreate(VehicleBase):
    pass


class VehicleRead(VehicleBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
