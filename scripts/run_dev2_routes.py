import json
import os
import sys
from typing import Any

import requests

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from tests.dev2_route_payloads import (  # noqa: E402
    ANALYZE_PAYLOAD,
    CHAT_PAYLOAD,
    COMPARE_PAYLOAD,
    JOURNEY_PAYLOAD,
)


class Dev2RouteClient:
    def __init__(self, base_url: str) -> None:
        self.base_url = base_url.rstrip("/")

    def post_json(self, path: str, payload: dict) -> requests.Response:
        return requests.post(
            f"{self.base_url}{path}",
            headers={"Content-Type": "application/json"},
            data=json.dumps(payload),
            timeout=60,
        )


class Dev2RoutePrinter:
    @staticmethod
    def print_section(title: str) -> None:
        print()
        print("=" * 16, title, "=" * 16)

    @staticmethod
    def pretty_json(value: Any) -> str:
        return json.dumps(value, indent=2, ensure_ascii=False)

    @staticmethod
    def parse_streamed_json(text: str) -> Any:
        text = text.strip()
        if not text:
            return None

        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        lines = [line.strip() for line in text.splitlines() if line.strip()]

        for line in reversed(lines):
            candidate = line
            if line.startswith("data:"):
                candidate = line[5:].strip()

            if candidate == "[DONE]":
                continue

            try:
                return json.loads(candidate)
            except json.JSONDecodeError:
                continue

        return text

    def show_response(
        self,
        name: str,
        response: requests.Response,
        streamed: bool = False,
    ) -> None:
        self.print_section(name)
        print(f"POST {response.request.url}")
        print(f"Status: {response.status_code}")
        print(f"Content-Type: {response.headers.get('content-type', 'unknown')}")

        if streamed:
            parsed = self.parse_streamed_json(response.text)
            print("Body:")
            if isinstance(parsed, (dict, list)):
                print(self.pretty_json(parsed))
            else:
                print(response.text.strip())
            return

        try:
            print("Body:")
            print(self.pretty_json(response.json()))
        except ValueError:
            print("Body:")
            print(response.text.strip())


class Dev2RouteRunner:
    def __init__(self, base_url: str) -> None:
        self.client = Dev2RouteClient(base_url)
        self.printer = Dev2RoutePrinter()

    def run(self) -> None:
        print(f"Testing Dev2 AI routes against {self.client.base_url}")
        print("Start the app first with `npm run dev`.")

        analyze = self.client.post_json("/api/analyze", ANALYZE_PAYLOAD)
        self.printer.show_response("Analyze", analyze)

        chat = self.client.post_json("/api/chat", CHAT_PAYLOAD)
        self.printer.show_response("Chat", chat, streamed=True)

        journey = self.client.post_json("/api/journey", JOURNEY_PAYLOAD)
        self.printer.show_response("Journey", journey)

        compare = self.client.post_json("/api/compare", COMPARE_PAYLOAD)
        self.printer.show_response("Compare", compare)


def main() -> None:
    base_url = os.getenv("DEV2_BASE_URL", "http://localhost:3000")
    runner = Dev2RouteRunner(base_url)
    runner.run()


if __name__ == "__main__":
    main()
