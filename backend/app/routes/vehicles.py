from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.dependencies import get_vehicle_service, require_admin
from app.schemas.vehicle import VehicleCreate, VehicleResponse
from app.services.vehicle import VehicleService

router = APIRouter(prefix="/vehicles")


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=VehicleResponse,
    dependencies=[Depends(require_admin)],
)
def create_vehicle(
    payload: VehicleCreate, service: Annotated[VehicleService, Depends(get_vehicle_service)]
) -> VehicleResponse:
    vehicle = service.create(**payload.model_dump())
    return VehicleResponse.model_validate(vehicle)
