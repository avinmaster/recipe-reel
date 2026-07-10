"""Pytest fixtures. Force MOCK mode + a throwaway data dir BEFORE importing the app."""
from __future__ import annotations

import os
import tempfile

# Must be set before app.config is imported (settings is a cached singleton).
os.environ["MOCK_MODE"] = "true"
os.environ.setdefault("DATA_DIR", tempfile.mkdtemp(prefix="recipereel-test-"))
os.environ["DATABASE_URL"] = f"sqlite:///{os.path.join(os.environ['DATA_DIR'], 'test.db')}"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def client() -> TestClient:
    with TestClient(app) as c:
        yield c
