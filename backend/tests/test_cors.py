from fastapi.testclient import TestClient


def preflight(client: TestClient, origin: str):
    return client.options(
        "/api/vehicles",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "Authorization",
        },
    )


def test_preflight_from_configured_frontend_origin_is_allowed(client: TestClient) -> None:
    response = preflight(client, "http://localhost:5173")

    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"


def test_preflight_from_unlisted_origin_is_not_allowed(client: TestClient) -> None:
    response = preflight(client, "http://evil.example")

    assert "access-control-allow-origin" not in response.headers
