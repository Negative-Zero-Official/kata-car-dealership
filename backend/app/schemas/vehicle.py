from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.schemas.money import Money

NonBlankStr = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class VehicleDetails(BaseModel):
    make: NonBlankStr
    model: NonBlankStr
    category: NonBlankStr
    price: Annotated[Money, Field(gt=0, decimal_places=2)]


class VehicleBase(VehicleDetails):
    quantity: Annotated[int, Field(ge=0)]


class VehicleCreate(VehicleBase):
    pass


class VehicleUpdate(VehicleDetails):
    pass


class VehicleRead(VehicleBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
