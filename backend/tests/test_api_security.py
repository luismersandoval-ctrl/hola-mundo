from datetime import datetime, timedelta


def test_login_injection_does_not_authenticate(client):
    for payload in ("' OR 1=1 --", "admin' UNION SELECT 1 --", "admin; DROP TABLE users; --"):
        response = client.post("/token", data={"username": payload, "password": "wrong-password"})
        assert response.status_code == 401


def test_security_headers_and_pagination_limits(client, admin_headers):
    response = client.get("/patients/", headers=admin_headers)
    assert response.status_code == 200
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert client.get("/patients/?limit=501", headers=admin_headers).status_code == 422
    assert client.get("/patients/?skip=-1", headers=admin_headers).status_code == 422


def test_patient_crud_keeps_sql_payload_literal_and_rejects_mass_assignment(client, admin_headers):
    malicious = "O'Connor OR 1=1 --"
    response = client.post("/patients/", headers=admin_headers, json={"first_name": "María", "first_surname": malicious})
    assert response.status_code == 200, response.text
    patient = response.json()
    assert malicious in patient["name"]
    rejected = client.post("/patients/", headers=admin_headers, json={"first_name": "Eve", "clinic_id": 999})
    assert rejected.status_code == 422
    listing = client.get("/patients/", headers=admin_headers).json()
    assert any(item["id"] == patient["id"] for item in listing)


def test_appointment_blocks_and_overlap_rules(client, admin_headers):
    room_response = client.put("/rooms/count", headers=admin_headers, json={"count": 2})
    assert room_response.status_code == 200, room_response.text
    rooms = room_response.json()
    patient = client.post("/patients/", headers=admin_headers, json={"first_name": "Agenda", "first_surname": "Prueba"}).json()
    start = (datetime.now() + timedelta(days=2)).replace(hour=8, minute=0, second=0, microsecond=0)
    base = {"date": start.isoformat(), "reason": "Control", "duration_minutes": 45, "room_id": rooms[0]["id"]}
    created = client.post(f"/patients/{patient['id']}/appointments", headers=admin_headers, json=base)
    assert created.status_code == 200, created.text
    assert created.json()["duration_minutes"] == 45
    invalid = {**base, "date": start.replace(minute=7).isoformat()}
    assert client.post(f"/patients/{patient['id']}/appointments", headers=admin_headers, json=invalid).status_code == 422
    overlap = {**base, "date": (start + timedelta(minutes=15)).isoformat()}
    assert client.post(f"/patients/{patient['id']}/appointments", headers=admin_headers, json=overlap).status_code == 409


def test_fake_diagnostic_image_is_rejected(client, admin_headers):
    patient = client.post("/patients/", headers=admin_headers, json={"first_name": "Imagen", "first_surname": "Prueba"}).json()
    response = client.post(
        f"/patients/{patient['id']}/diagnostic-images",
        headers=admin_headers,
        data={"study_type": "panoramic", "title": "RX"},
        files={"file": ("rx.png", b"not-a-png", "image/png")},
    )
    assert response.status_code == 422


def test_request_body_limit(client, admin_headers):
    response = client.post(
        "/patients/",
        headers={**admin_headers, "content-length": str(3 * 1024 * 1024)},
        json={"first_name": "Ana"},
    )
    assert response.status_code == 413
