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


def test_listing_vehicles_returns_all_ordered_by_id_including_zero_stock(
    client: TestClient,
    make_user: Callable[..., User],
    auth_headers: Callable[[User], dict[str, str]],
) -> None:
    admin = make_user(email="root@example.com", role="admin")
    user = make_user(email="alice@example.com")
    payloads = [
        VEHICLE,
        {**VEHICLE, "make": "Honda", "model": "Civic", "price": "22000.00", "quantity": 0},
        {**VEHICLE, "make": "Ford", "model": "F-150", "category": "truck", "quantity": 2},
    ]
    created = [
        client.post("/api/vehicles", json=payload, headers=auth_headers(admin)).json()
        for payload in payloads
    ]

    response = client.get("/api/vehicles", headers=auth_headers(user))

    assert response.status_code == 200
    assert response.json() == sorted(created, key=lambda vehicle: vehicle["id"])


def test_listing_vehicles_with_empty_db_returns_empty_list(
    client: TestClient,
    make_user: Callable[..., User],
    auth_headers: Callable[[User], dict[str, str]],
) -> None:
    user = make_user(email="alice@example.com")

    response = client.get("/api/vehicles", headers=auth_headers(user))

    assert response.status_code == 200
    assert response.json() == []


def test_listing_vehicles_without_token_returns_401(client: TestClient) -> None:
    response = client.get("/api/vehicles")

    assert response.status_code == 401


def test_listing_vehicles_with_limit_and_offset_returns_that_page(
    client: TestClient,
    make_user: Callable[..., User],
    auth_headers: Callable[[User], dict[str, str]],
) -> None:
    admin = make_user(email="root@example.com", role="admin")
    user = make_user(email="alice@example.com")
    created = [
        client.post(
            "/api/vehicles", json={**VEHICLE, "model": f"Model {n}"}, headers=auth_headers(admin)
        ).json()
        for n in range(1, 6)
    ]

    response = client.get("/api/vehicles?limit=2&offset=2", headers=auth_headers(user))

    assert response.status_code == 200
    assert response.json() == created[2:4]


def test_listing_vehicles_with_limit_over_100_returns_422(
    client: TestClient,
    make_user: Callable[..., User],
    auth_headers: Callable[[User], dict[str, str]],
) -> None:
    user = make_user(email="alice@example.com")

    response = client.get("/api/vehicles?limit=101", headers=auth_headers(user))

    assert response.status_code == 422


@pytest.mark.parametrize(
    "query",
    [
        pytest.param("limit=0", id="zero-limit"),
        pytest.param("limit=-1", id="negative-limit"),
        pytest.param("offset=-1", id="negative-offset"),
    ],
)
def test_listing_vehicles_with_out_of_range_pagination_returns_422(
    client: TestClient,
    make_user: Callable[..., User],
    auth_headers: Callable[[User], dict[str, str]],
    query: str,
) -> None:
    user = make_user(email="alice@example.com")

    response = client.get(f"/api/vehicles?{query}", headers=auth_headers(user))

    assert response.status_code == 422


def test_admin_updates_vehicle_details_and_quantity_is_unchanged(
    client: TestClient,
    make_user: Callable[..., User],
    auth_headers: Callable[[User], dict[str, str]],
) -> None:
    admin = make_user(email="root@example.com", role="admin")
    created = client.post("/api/vehicles", json=VEHICLE, headers=auth_headers(admin)).json()

    response = client.put(
        f"/api/vehicles/{created['id']}",
        json={"make": "Honda", "model": "Civic", "category": "hatchback", "price": "21500.50"},
        headers=auth_headers(admin),
    )

    assert response.status_code == 200
    assert response.json() == {
        "id": created["id"],
        "make": "Honda",
        "model": "Civic",
        "category": "hatchback",
        "price": "21500.50",
        "quantity": 5,
    }


UPDATE = {"make": "Honda", "model": "Civic", "category": "hatchback", "price": "21500.50"}


def test_updating_unknown_vehicle_returns_404(
    client: TestClient,
    make_user: Callable[..., User],
    auth_headers: Callable[[User], dict[str, str]],
) -> None:
    admin = make_user(email="root@example.com", role="admin")

    response = client.put("/api/vehicles/999", json=UPDATE, headers=auth_headers(admin))

    assert response.status_code == 404


def test_updating_vehicle_as_regular_user_returns_403(
    client: TestClient,
    make_user: Callable[..., User],
    auth_headers: Callable[[User], dict[str, str]],
) -> None:
    admin = make_user(email="root@example.com", role="admin")
    user = make_user(email="alice@example.com")
    created = client.post("/api/vehicles", json=VEHICLE, headers=auth_headers(admin)).json()

    response = client.put(f"/api/vehicles/{created['id']}", json=UPDATE, headers=auth_headers(user))

    assert response.status_code == 403


def test_updating_vehicle_without_token_returns_401(
    client: TestClient,
    make_user: Callable[..., User],
    auth_headers: Callable[[User], dict[str, str]],
) -> None:
    admin = make_user(email="root@example.com", role="admin")
    created = client.post("/api/vehicles", json=VEHICLE, headers=auth_headers(admin)).json()

    response = client.put(f"/api/vehicles/{created['id']}", json=UPDATE)

    assert response.status_code == 401


def _update_without(field: str) -> dict[str, object]:
    return {key: value for key, value in UPDATE.items() if key != field}


@pytest.mark.parametrize(
    "payload",
    [
        *(pytest.param(_update_without(field), id=f"missing-{field}") for field in UPDATE),
        *(
            pytest.param({**UPDATE, field: blank}, id=f"{label}-{field}")
            for field in ("make", "model", "category")
            for label, blank in (("blank", ""), ("whitespace", "   "))
        ),
        pytest.param({**UPDATE, "price": "0"}, id="zero-price"),
        pytest.param({**UPDATE, "price": "-1.00"}, id="negative-price"),
        pytest.param({**UPDATE, "price": "21500.505"}, id="price-3-decimals"),
    ],
)
def test_updating_vehicle_with_invalid_payload_returns_422(
    client: TestClient,
    make_user: Callable[..., User],
    auth_headers: Callable[[User], dict[str, str]],
    payload: dict[str, object],
) -> None:
    admin = make_user(email="root@example.com", role="admin")
    created = client.post("/api/vehicles", json=VEHICLE, headers=auth_headers(admin)).json()

    response = client.put(
        f"/api/vehicles/{created['id']}", json=payload, headers=auth_headers(admin)
    )

    assert response.status_code == 422
