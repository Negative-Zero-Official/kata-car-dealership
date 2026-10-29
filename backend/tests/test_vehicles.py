from collections.abc import Callable
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient

from app.models import User, Vehicle


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


@pytest.mark.parametrize(
    "price",
    [
        pytest.param("100", id="whole-number"),
        pytest.param("100.5", id="one-decimal-place"),
        pytest.param("1e2", id="scientific-notation"),
    ],
)
def test_created_vehicle_price_is_returned_with_two_decimal_places(
    client: TestClient,
    make_user: Callable[..., User],
    auth_headers: Callable[[User], dict[str, str]],
    price: str,
) -> None:
    admin = make_user(email="root@example.com", role="admin")

    response = client.post(
        "/api/vehicles",
        json={
            "make": "Toyota",
            "model": "Corolla",
            "category": "sedan",
            "price": price,
            "quantity": 5,
        },
        headers=auth_headers(admin),
    )

    assert response.status_code == 201
    assert response.json()["price"] == f"{Decimal(price):.2f}"


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


def _as_json(vehicle: Vehicle) -> dict[str, object]:
    return {
        "id": vehicle.id,
        "make": vehicle.make,
        "model": vehicle.model,
        "category": vehicle.category,
        "price": str(vehicle.price),
        "quantity": vehicle.quantity,
    }


def test_listing_vehicles_returns_all_ordered_by_id_including_zero_stock(
    client: TestClient,
    make_user: Callable[..., User],
    make_vehicle: Callable[..., Vehicle],
    auth_headers: Callable[[User], dict[str, str]],
) -> None:
    user = make_user(email="alice@example.com")
    created = [
        make_vehicle(),
        make_vehicle(make="Honda", model="Civic", price=Decimal("22000.00"), quantity=0),
        make_vehicle(make="Ford", model="F-150", category="truck", quantity=2),
    ]

    response = client.get("/api/vehicles", headers=auth_headers(user))

    assert response.status_code == 200
    assert response.json() == [
        _as_json(vehicle) for vehicle in sorted(created, key=lambda vehicle: vehicle.id)
    ]


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
    make_vehicle: Callable[..., Vehicle],
    auth_headers: Callable[[User], dict[str, str]],
) -> None:
    user = make_user(email="alice@example.com")
    created = [make_vehicle(model=f"Model {n}") for n in range(1, 6)]

    response = client.get("/api/vehicles?limit=2&offset=2", headers=auth_headers(user))

    assert response.status_code == 200
    assert response.json() == [_as_json(vehicle) for vehicle in created[2:4]]


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
    make_vehicle: Callable[..., Vehicle],
    auth_headers: Callable[[User], dict[str, str]],
) -> None:
    admin = make_user(email="root@example.com", role="admin")
    vehicle = make_vehicle()

    response = client.put(
        f"/api/vehicles/{vehicle.id}",
        json={"make": "Honda", "model": "Civic", "category": "hatchback", "price": "21500.50"},
        headers=auth_headers(admin),
    )

    assert response.status_code == 200
    assert response.json() == {
        "id": vehicle.id,
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
    make_vehicle: Callable[..., Vehicle],
    auth_headers: Callable[[User], dict[str, str]],
) -> None:
    user = make_user(email="alice@example.com")
    vehicle = make_vehicle()

    response = client.put(f"/api/vehicles/{vehicle.id}", json=UPDATE, headers=auth_headers(user))

    assert response.status_code == 403


def test_updating_vehicle_without_token_returns_401(
    client: TestClient, make_vehicle: Callable[..., Vehicle]
) -> None:
    vehicle = make_vehicle()

    response = client.put(f"/api/vehicles/{vehicle.id}", json=UPDATE)

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
    make_vehicle: Callable[..., Vehicle],
    auth_headers: Callable[[User], dict[str, str]],
    payload: dict[str, object],
) -> None:
    admin = make_user(email="root@example.com", role="admin")
    vehicle = make_vehicle()

    response = client.put(f"/api/vehicles/{vehicle.id}", json=payload, headers=auth_headers(admin))

    assert response.status_code == 422


def test_admin_deletes_vehicle_and_it_is_gone_from_the_list(
    client: TestClient,
    make_user: Callable[..., User],
    make_vehicle: Callable[..., Vehicle],
    auth_headers: Callable[[User], dict[str, str]],
) -> None:
    admin = make_user(email="root@example.com", role="admin")
    kept = make_vehicle()
    doomed = make_vehicle(model="Camry")

    response = client.delete(f"/api/vehicles/{doomed.id}", headers=auth_headers(admin))

    assert response.status_code == 204
    assert response.content == b""
    listing = client.get("/api/vehicles", headers=auth_headers(admin))
    assert listing.json() == [_as_json(kept)]


def test_deleting_unknown_vehicle_returns_404(
    client: TestClient,
    make_user: Callable[..., User],
    auth_headers: Callable[[User], dict[str, str]],
) -> None:
    admin = make_user(email="root@example.com", role="admin")

    response = client.delete("/api/vehicles/999", headers=auth_headers(admin))

    assert response.status_code == 404


def test_deleting_vehicle_as_regular_user_returns_403_and_keeps_it(
    client: TestClient,
    make_user: Callable[..., User],
    make_vehicle: Callable[..., Vehicle],
    auth_headers: Callable[[User], dict[str, str]],
) -> None:
    user = make_user(email="alice@example.com")
    vehicle = make_vehicle()

    response = client.delete(f"/api/vehicles/{vehicle.id}", headers=auth_headers(user))

    assert response.status_code == 403
    listing = client.get("/api/vehicles", headers=auth_headers(user))
    assert listing.json() == [_as_json(vehicle)]


def test_searching_by_partial_make_is_case_insensitive_and_excludes_others(
    client: TestClient,
    make_user: Callable[..., User],
    make_vehicle: Callable[..., Vehicle],
    auth_headers: Callable[[User], dict[str, str]],
) -> None:
    user = make_user(email="alice@example.com")
    corolla = make_vehicle()
    camry = make_vehicle(make="TOYOTA", model="Camry")
    make_vehicle(make="Honda", model="Civic")

    response = client.get("/api/vehicles/search?make=toy", headers=auth_headers(user))

    assert response.status_code == 200
    assert response.json() == [_as_json(corolla), _as_json(camry)]


@pytest.mark.parametrize(
    ("field", "query", "matching", "other"),
    [
        ("model", "cor", ("Corolla", "COROLLA Cross"), "Camry"),
        ("category", "suv", ("SUV", "compact suv"), "sedan"),
    ],
)
def test_searching_by_partial_field_is_case_insensitive_and_excludes_others(
    client: TestClient,
    make_user: Callable[..., User],
    make_vehicle: Callable[..., Vehicle],
    auth_headers: Callable[[User], dict[str, str]],
    field: str,
    query: str,
    matching: tuple[str, str],
    other: str,
) -> None:
    user = make_user(email="alice@example.com")
    first = make_vehicle(**{field: matching[0]})
    second = make_vehicle(**{field: matching[1]})
    make_vehicle(**{field: other})

    response = client.get(f"/api/vehicles/search?{field}={query}", headers=auth_headers(user))

    assert response.status_code == 200
    assert response.json() == [_as_json(first), _as_json(second)]


@pytest.mark.parametrize(
    ("query", "expected_prices"),
    [
        ("min_price=20000", ("20000.00", "30000.00")),
        ("max_price=20000", ("10000.00", "20000.00")),
        ("min_price=20000&max_price=20000", ("20000.00",)),
    ],
)
def test_searching_by_price_range_is_inclusive(
    client: TestClient,
    make_user: Callable[..., User],
    make_vehicle: Callable[..., Vehicle],
    auth_headers: Callable[[User], dict[str, str]],
    query: str,
    expected_prices: tuple[str, ...],
) -> None:
    user = make_user(email="alice@example.com")
    for price in ("10000", "20000", "30000"):
        make_vehicle(price=Decimal(price))

    response = client.get(f"/api/vehicles/search?{query}", headers=auth_headers(user))

    assert response.status_code == 200
    assert tuple(v["price"] for v in response.json()) == expected_prices


def test_searching_with_several_filters_returns_only_vehicles_matching_all(
    client: TestClient,
    make_user: Callable[..., User],
    make_vehicle: Callable[..., Vehicle],
    auth_headers: Callable[[User], dict[str, str]],
) -> None:
    user = make_user(email="alice@example.com")
    match = make_vehicle(make="Toyota", category="suv", price=Decimal("30000.00"))
    make_vehicle(make="Honda", category="suv", price=Decimal("30000.00"))
    make_vehicle(make="Toyota", category="sedan", price=Decimal("30000.00"))
    make_vehicle(make="Toyota", category="suv", price=Decimal("50000.00"))

    response = client.get(
        "/api/vehicles/search?make=toyota&category=suv&max_price=40000",
        headers=auth_headers(user),
    )

    assert response.status_code == 200
    assert response.json() == [_as_json(match)]


def test_searching_without_filters_returns_all_vehicles(
    client: TestClient,
    make_user: Callable[..., User],
    make_vehicle: Callable[..., Vehicle],
    auth_headers: Callable[[User], dict[str, str]],
) -> None:
    user = make_user(email="alice@example.com")
    created = [make_vehicle(), make_vehicle(make="Honda", model="Civic")]

    response = client.get("/api/vehicles/search", headers=auth_headers(user))

    assert response.status_code == 200
    assert response.json() == [_as_json(vehicle) for vehicle in created]


def test_searching_with_no_match_returns_empty_list(
    client: TestClient,
    make_user: Callable[..., User],
    make_vehicle: Callable[..., Vehicle],
    auth_headers: Callable[[User], dict[str, str]],
) -> None:
    user = make_user(email="alice@example.com")
    make_vehicle()

    response = client.get("/api/vehicles/search?make=ferrari", headers=auth_headers(user))

    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.parametrize(
    ("query", "expected_model"),
    [
        pytest.param("model=F_150", "F_150", id="underscore"),
        pytest.param("model=100%25", "100%", id="percent"),
    ],
)
def test_searching_treats_like_wildcards_in_the_query_literally(
    client: TestClient,
    make_user: Callable[..., User],
    make_vehicle: Callable[..., Vehicle],
    auth_headers: Callable[[User], dict[str, str]],
    query: str,
    expected_model: str,
) -> None:
    user = make_user(email="alice@example.com")
    match = make_vehicle(model=expected_model)
    make_vehicle(model="FX150")
    make_vehicle(model="1000")

    response = client.get(f"/api/vehicles/search?{query}", headers=auth_headers(user))

    assert response.status_code == 200
    assert response.json() == [_as_json(match)]


@pytest.mark.parametrize(
    "query",
    [
        pytest.param("min_price=30000&max_price=20000", id="min-above-max"),
        pytest.param("min_price=-1", id="negative-min"),
        pytest.param("max_price=-1", id="negative-max"),
        pytest.param("min_price=abc", id="non-numeric-min"),
        pytest.param("max_price=abc", id="non-numeric-max"),
    ],
)
def test_searching_with_invalid_price_parameters_returns_422(
    client: TestClient,
    make_user: Callable[..., User],
    auth_headers: Callable[[User], dict[str, str]],
    query: str,
) -> None:
    user = make_user(email="alice@example.com")

    response = client.get(f"/api/vehicles/search?{query}", headers=auth_headers(user))

    assert response.status_code == 422


def test_searching_without_token_returns_401(client: TestClient) -> None:
    response = client.get("/api/vehicles/search")

    assert response.status_code == 401


def test_searching_by_quantity_returns_only_exact_matches(
    client: TestClient,
    make_user: Callable[..., User],
    make_vehicle: Callable[..., Vehicle],
    auth_headers: Callable[[User], dict[str, str]],
) -> None:
    user = make_user(email="alice@example.com")
    match = make_vehicle(make="Toyota", quantity=2)
    make_vehicle(make="Honda", quantity=3)
    make_vehicle(make="Ford", quantity=4)

    response = client.get("api/vehicles/search?quantity=2", headers=auth_headers(user))

    assert response.status_code == 200
    assert response.json() == [_as_json(match)]
