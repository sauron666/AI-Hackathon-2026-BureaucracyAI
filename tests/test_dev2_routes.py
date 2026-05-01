import os

import pytest
import requests

from tests.dev2_route_payloads import (
    ANALYZE_PAYLOAD,
    CHAT_PAYLOAD,
    COMPARE_PAYLOAD,
    INVALID_ANALYZE_PAYLOAD,
    INVALID_CHAT_PAYLOAD,
    INVALID_COMPARE_PAYLOAD,
    INVALID_JOURNEY_PAYLOAD,
    JOURNEY_PAYLOAD,
)


class Dev2RouteTestClient:
    def __init__(self, base_url: str) -> None:
        self.base_url = base_url.rstrip("/")

    def healthcheck(self) -> requests.Response:
        return requests.get(self.base_url, timeout=10)

    def post_json(self, path: str, payload: dict) -> requests.Response:
        return requests.post(
            f"{self.base_url}{path}",
            headers={"Content-Type": "application/json"},
            json=payload,
            timeout=60,
        )


class Dev2RouteAssertions:
    @staticmethod
    def assert_json_route(response: requests.Response, required_keys: list[str]) -> None:
        assert response.status_code == 200, response.text
        payload = response.json()
        for key in required_keys:
            assert key in payload

    @staticmethod
    def assert_stream_route(response: requests.Response) -> None:
        assert response.status_code == 200, response.text
        assert response.text.strip(), "Expected streamed response body from /api/chat"

    @staticmethod
    def assert_error_route(response: requests.Response, expected_status: int) -> None:
        assert response.status_code == expected_status, response.text
        payload = response.json()
        assert "error" in payload


@pytest.fixture(scope="session")
def route_client() -> Dev2RouteTestClient:
    base_url = os.getenv("DEV2_BASE_URL", "http://localhost:3000")
    return Dev2RouteTestClient(base_url)


@pytest.fixture(scope="session", autouse=True)
def verify_server_is_running(route_client: Dev2RouteTestClient) -> None:
    try:
        response = route_client.healthcheck()
    except requests.RequestException as exc:
        pytest.fail(
            f"Could not reach Next.js server at {route_client.base_url}. "
            "Start it with `npm run dev` first.\n"
            f"Original error: {exc}"
        )

    assert response.status_code < 500, (
        f"Server at {route_client.base_url} responded with unexpected status "
        f"{response.status_code}"
    )


def test_analyze_route(route_client: Dev2RouteTestClient):
    response = route_client.post_json("/api/analyze", ANALYZE_PAYLOAD)

    Dev2RouteAssertions.assert_json_route(
        response,
        ["risk_level", "summary", "verdict"],
    )


def test_chat_route(route_client: Dev2RouteTestClient):
    response = route_client.post_json("/api/chat", CHAT_PAYLOAD)

    Dev2RouteAssertions.assert_stream_route(response)


def test_journey_route(route_client: Dev2RouteTestClient):
    response = route_client.post_json("/api/journey", JOURNEY_PAYLOAD)

    Dev2RouteAssertions.assert_json_route(
        response,
        ["title", "phases", "warnings"],
    )


def test_compare_route(route_client: Dev2RouteTestClient):
    response = route_client.post_json("/api/compare", COMPARE_PAYLOAD)

    Dev2RouteAssertions.assert_json_route(
        response,
        ["question_interpreted", "countries", "recommendation"],
    )


def test_chat_route_rejects_unsupported_country(route_client: Dev2RouteTestClient):
    response = route_client.post_json("/api/chat", INVALID_CHAT_PAYLOAD)

    Dev2RouteAssertions.assert_error_route(response, 400)


def test_analyze_route_requires_text_or_file(route_client: Dev2RouteTestClient):
    response = route_client.post_json("/api/analyze", INVALID_ANALYZE_PAYLOAD)

    Dev2RouteAssertions.assert_error_route(response, 400)


def test_journey_route_rejects_unsupported_country(route_client: Dev2RouteTestClient):
    response = route_client.post_json("/api/journey", INVALID_JOURNEY_PAYLOAD)

    Dev2RouteAssertions.assert_error_route(response, 400)


def test_compare_route_rejects_unsupported_country(route_client: Dev2RouteTestClient):
    response = route_client.post_json("/api/compare", INVALID_COMPARE_PAYLOAD)

    Dev2RouteAssertions.assert_error_route(response, 400)
