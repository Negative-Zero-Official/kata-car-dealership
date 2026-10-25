from collections.abc import Callable

import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session, sessionmaker

from app import cli
from app.core.config import Settings
from app.demo_data import DEMO_VEHICLES
from app.domain.errors import EmailBelongsToNonAdmin
from app.models import User, Vehicle
from tests.factories import PASSWORD


def test_create_admin_exits_1_when_email_belongs_to_regular_user(
    settings: Settings, make_user: Callable[..., User], capsys: pytest.CaptureFixture[str]
) -> None:
    make_user(email="root@example.com")
    settings = settings.model_copy(
        update={"ADMIN_EMAIL": "root@example.com", "ADMIN_PASSWORD": PASSWORD}
    )

    exit_code = cli.create_admin(settings)

    out, err = capsys.readouterr()
    assert exit_code == 1
    assert "root@example.com" in err
    assert EmailBelongsToNonAdmin.detail in err
    assert "Admin ready" not in out


@pytest.mark.parametrize(
    "admin_env",
    [
        pytest.param({"ADMIN_PASSWORD": PASSWORD}, id="email-unset"),
        pytest.param({"ADMIN_EMAIL": "root@example.com"}, id="password-unset"),
        pytest.param({}, id="both-unset"),
    ],
)
def test_create_admin_exits_1_when_admin_env_unset(
    settings: Settings, admin_env: dict[str, str], capsys: pytest.CaptureFixture[str]
) -> None:
    settings = settings.model_copy(update=admin_env)

    exit_code = cli.create_admin(settings)

    _, err = capsys.readouterr()
    assert exit_code == 1
    assert "ADMIN_EMAIL and ADMIN_PASSWORD must be set" in err


def test_seed_demo_loads_demo_vehicles_with_some_out_of_stock(
    settings: Settings, session_factory: sessionmaker[Session]
) -> None:
    exit_code = cli.seed_demo(settings)

    with session_factory() as session:
        vehicles = list(session.scalars(select(Vehicle)))
    assert exit_code == 0
    assert len(vehicles) == len(DEMO_VEHICLES)
    assert any(vehicle.quantity == 0 for vehicle in vehicles)


def test_seed_demo_skips_inventory_that_is_not_empty(
    settings: Settings,
    session_factory: sessionmaker[Session],
    make_vehicle: Callable[..., Vehicle],
    capsys: pytest.CaptureFixture[str],
) -> None:
    make_vehicle()

    exit_code = cli.seed_demo(settings)

    out, _ = capsys.readouterr()
    with session_factory() as session:
        count = session.scalar(select(func.count()).select_from(Vehicle))
    assert exit_code == 0
    assert count == 1
    assert "skipping" in out
