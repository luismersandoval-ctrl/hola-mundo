import os
import tempfile
from pathlib import Path

import pytest


TEST_ROOT = Path(tempfile.mkdtemp(prefix="odontospace-tests-"))
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_ROOT / 'test.db'}"
os.environ["DIAGNOSTIC_UPLOAD_ROOT"] = str(TEST_ROOT / "uploads")
os.environ["CONSENT_TEMPLATE_ROOT"] = str(TEST_ROOT / "consent-templates")
os.environ["SECRET_KEY"] = "test-only-secret-key"
os.environ["ADMIN_PASSWORD"] = "AdminTest123!"

from fastapi.testclient import TestClient  # noqa: E402
from main import app  # noqa: E402


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="session")
def admin_headers(client):
    response = client.post("/token", data={"username": "admin", "password": "AdminTest123!"})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}
