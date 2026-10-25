from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.dependencies import get_current_user, get_vehicle_service, require_admin
from app.schemas.vehicle import VehicleCreate, VehicleRead
from app.services.vehicle import VehicleService

router = APIRouter(prefix="/vehicles")


@router.get("", response_model=list[VehicleRead], dependencies=[Depends(get_current_user)])
def list_vehicles(
    service: Annotated[VehicleService, Depends(get_vehicle_service)],
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[VehicleRead]:
    vehicles = service.list_all(limit=limit, offset=offset)
    return [VehicleRead.model_validate(vehicle) for vehicle in vehicles]


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
