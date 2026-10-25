from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.dependencies import get_current_user, get_vehicle_service, require_admin
from app.schemas.vehicle import VehicleCreate, VehicleRead
from app.services.vehicle import VehicleService

router = APIRouter(prefix="/vehicles")


@router.get("", response_model=list[VehicleRead], dependencies=[Depends(get_current_user)])
def list_vehicles(
    service: Annotated[VehicleService, Depends(get_vehicle_service)],
) -> list[VehicleRead]:
    return [VehicleRead.model_validate(vehicle) for vehicle in service.list_all()]


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=VehicleRead,
    dependencies=[Depends(require_admin)],
)
def create_vehicle(
    payload: VehicleCreate, service: Annotated[VehicleService, Depends(get_vehicle_service)]
) -> VehicleRead:
    vehicle = service.create(**payload.model_dump())
    return VehicleRead.model_validate(vehicle)
