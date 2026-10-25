import threading
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor

from sqlalchemy.orm import Session, sessionmaker

from app.domain.errors import InsufficientStock
from app.models import Vehicle
from app.repositories.vehicle import VehicleRepository
from app.services.inventory import InventoryService


def test_try_decrement_reduces_stock_when_enough_is_available(
    session_factory: sessionmaker[Session], make_vehicle: Callable[..., Vehicle]
) -> None:
    vehicle = make_vehicle(quantity=5)

    with session_factory() as session:
        assert VehicleRepository(session).try_decrement(vehicle.id, 3) is True

    with session_factory() as session:
        assert session.get(Vehicle, vehicle.id).quantity == 2


def test_try_decrement_leaves_stock_unchanged_when_not_enough_is_available(
    session_factory: sessionmaker[Session], make_vehicle: Callable[..., Vehicle]
) -> None:
    vehicle = make_vehicle(quantity=2)

    with session_factory() as session:
        assert VehicleRepository(session).try_decrement(vehicle.id, 3) is False

    with session_factory() as session:
        assert session.get(Vehicle, vehicle.id).quantity == 2


def test_concurrent_purchases_never_oversell(
    session_factory: sessionmaker[Session], make_vehicle: Callable[..., Vehicle]
) -> None:
    buyers = 10
    vehicle = make_vehicle(quantity=5)
    start = threading.Barrier(buyers)

    def buy_one() -> bool:
        with session_factory() as session:
            service = InventoryService(VehicleRepository(session))
            start.wait()
            try:
                service.purchase(vehicle.id, 1)
            except InsufficientStock:
                return False
            return True

    with ThreadPoolExecutor(max_workers=buyers) as pool:
        results = list(pool.map(lambda _: buy_one(), range(buyers)))

    assert results.count(True) == 5
    with session_factory() as session:
        assert session.get(Vehicle, vehicle.id).quantity == 0
