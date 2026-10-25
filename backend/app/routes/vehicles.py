from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.dependencies import get_current_user, get_vehicle_service, require_admin
from app.domain.vehicle_filter import VehicleFilter
from app.schemas.vehicle import VehicleCreate, VehicleRead, VehicleUpdate
from app.services.vehicle import VehicleService

router = APIRouter(prefix="/vehicles")

VehicleServiceDep = Annotated[VehicleService, Depends(get_vehicle_service)]


@router.get("", response_model=list[VehicleRead], dependencies=[Depends(get_current_user)])
def list_vehicles(
    service: VehicleServiceDep,
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[VehicleRead]:
    vehicles = service.list_all(limit=limit, offset=offset)
    return [VehicleRead.model_validate(vehicle) for vehicle in vehicles]


@router.get("/search", response_model=list[VehicleRead], dependencies=[Depends(get_current_user)])
def search_vehicles(service: VehicleServiceDep, make: str | None = None) -> list[VehicleRead]:
    vehicles = service.search(VehicleFilter(make=make))
    return [VehicleRead.model_validate(vehicle) for vehicle in vehicles]


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=VehicleRead,
    dependencies=[Depends(require_admin)],
)
def create_vehicle(payload: VehicleCreate, service: VehicleServiceDep) -> VehicleRead:
    vehicle = service.create(**payload.model_dump())
    return VehicleRead.model_validate(vehicle)


@router.put("/{vehicle_id}", response_model=VehicleRead, dependencies=[Depends(require_admin)])
def update_vehicle(
    vehicle_id: int,
    payload: VehicleUpdate,
    service: VehicleServiceDep,
) -> VehicleRead:
    vehicle = service.update(vehicle_id, **payload.model_dump())
    return VehicleRead.model_validate(vehicle)


@router.delete(
    "/{vehicle_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_admin)],
)
def delete_vehicle(vehicle_id: int, service: VehicleServiceDep) -> None:
    service.delete(vehicle_id)
