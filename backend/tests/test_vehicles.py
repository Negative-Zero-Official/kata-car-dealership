from collections.abc import Callable

import pytest
from fastapi.testclient import TestClient

from app.models import User


def test_admin_creates_vehicle_and_price_round_trips_as_string(
    client: TestClient,
    make_user: Callable[..., User],
    auth_headers: Callable[[User], dict[str, str]],
) -> None:
    admin = make_user(email="root@example.com", role="admin")

    response = client.post(
        "/api/vehicles",
        json={
            "make": "Toyota",
            "model": "Corolla",
            "category": "sedan",
            "price": "24999.99",
            "quantity": 5,
        },
        headers=auth_headers(admin),
    )

    assert response.status_code == 201
    body = response.json()
    assert isinstance(body["id"], int)
    assert body == {
        "id": body["id"],
        "make": "Toyota",
        "model": "Corolla",
        "category": "sedan",
        "price": "24999.99",
        "quantity": 5,
    }


VEHICLE = {
    "make": "Toyota",
    "model": "Corolla",
    "category": "sedan",
    "price": "24999.99",
    "quantity": 5,
}


def test_adding_vehicle_without_token_returns_401(client: TestClient) -> None:
    response = client.post("/api/vehicles", json=VEHICLE)

    assert response.status_code == 401


def test_adding_vehicle_as_regular_user_returns_403(
    client: TestClient,
    make_user: Callable[..., User],
    auth_headers: Callable[[User], dict[str, str]],
) -> None:
    user = make_user(email="alice@example.com")

    response = client.post("/api/vehicles", json=VEHICLE, headers=auth_headers(user))

    assert response.status_code == 403


def _without(field: str) -> dict[str, object]:
    return {key: value for key, value in VEHICLE.items() if key != field}


@pytest.mark.parametrize(
    "payload",
    [
        *(pytest.param(_without(field), id=f"missing-{field}") for field in VEHICLE),
        *(
            pytest.param({**VEHICLE, field: blank}, id=f"{label}-{field}")
            for field in ("make", "model", "category")
            for label, blank in (("blank", ""), ("whitespace", "   "))
        ),
        pytest.param({**VEHICLE, "price": "0"}, id="zero-price"),
        pytest.param({**VEHICLE, "price": "-1.00"}, id="negative-price"),
        pytest.param({**VEHICLE, "price": "24999.999"}, id="price-3-decimals"),
        pytest.param({**VEHICLE, "quantity": -1}, id="negative-quantity"),
        pytest.param({**VEHICLE, "quantity": 1.5}, id="fractional-quantity"),
        pytest.param({**VEHICLE, "quantity": "abc"}, id="non-numeric-quantity"),
    ],
)
def test_adding_vehicle_with_invalid_payload_returns_422(
    client: TestClient,
    make_user: Callable[..., User],
    auth_headers: Callable[[User], dict[str, str]],
    payload: dict[str, object],
) -> None:
    admin = make_user(email="root@example.com", role="admin")

    response = client.post("/api/vehicles", json=payload, headers=auth_headers(admin))

    assert response.status_code == 422
