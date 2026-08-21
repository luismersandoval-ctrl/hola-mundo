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


def test_patient_list_is_alphabetical(client, admin_headers):
    for first_name in ("Zulema", "Alberto"):
        response = client.post("/patients/", headers=admin_headers, json={"first_name": first_name})
        assert response.status_code == 200, response.text
    names = [patient["name"] for patient in client.get("/patients/", headers=admin_headers).json()]
    assert names == sorted(names, key=str.casefold)


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
    moved = {**base, "date": (start + timedelta(days=1)).isoformat(), "reason": "Control corregido", "room_id": rooms[1]["id"]}
    updated = client.put(f"/appointments/{created.json()['id']}", headers=admin_headers, json=moved)
    assert updated.status_code == 200, updated.text
    assert updated.json()["reason"] == "Control corregido"
    assert updated.json()["date"].startswith((start + timedelta(days=1)).date().isoformat())


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


def test_daily_cash_closing_freezes_totals_and_day(client, admin_headers):
    business_date = (datetime.now() - timedelta(days=3)).date().isoformat()
    income = client.post("/payments/", headers=admin_headers, json={
        "type": "income", "concept": "Ingreso caja", "amount": 150000,
        "method": "cash", "business_date": business_date,
    })
    expense = client.post("/payments/", headers=admin_headers, json={
        "type": "expense", "concept": "Compra insumos", "amount": 40000,
        "method": "cash", "business_date": business_date,
    })
    assert income.status_code == 200, income.text
    assert expense.status_code == 200, expense.text
    daily = client.get(f"/payments/?business_date={business_date}", headers=admin_headers)
    assert daily.status_code == 200 and len(daily.json()) == 2

    closing = client.post("/cash-closings", headers=admin_headers, json={"business_date": business_date, "notes": "Cierre de prueba"})
    assert closing.status_code == 200, closing.text
    payload = closing.json()
    assert payload["income_total"] == 150000
    assert payload["expense_total"] == 40000
    assert payload["balance_total"] == 110000
    assert payload["cash_available"] == 110000
    assert payload["movement_count"] == 2

    late = client.post("/payments/", headers=admin_headers, json={
        "type": "income", "concept": "Movimiento tardío", "amount": 1,
        "method": "cash", "business_date": business_date,
    })
    assert late.status_code == 409


def test_clinical_history_persists_emergency_relationship(client, admin_headers):
    patient = client.post("/patients/", headers=admin_headers, json={"first_name": "Historia", "first_surname": "Prueba"}).json()
    response = client.post(f"/patients/{patient['id']}/clinical-history", headers=admin_headers, json={
        "emergency_contact": "Laura Prueba",
        "emergency_relationship": "Hermana",
        "emergency_phone": "3001234567",
    })
    assert response.status_code == 200, response.text
    assert response.json()["emergency_relationship"] == "Hermana"


def test_document_identity_is_saved_and_prevents_duplicates(client, admin_headers):
    first = client.post("/patients/", headers=admin_headers, json={
        "first_name": "Documento", "first_surname": "Uno", "document_type": "CC", "document_number": "123456789",
    })
    assert first.status_code == 200, first.text
    duplicate = client.post("/patients/", headers=admin_headers, json={
        "first_name": "Documento", "first_surname": "Dos", "document_type": "CC", "document_number": "123456789",
    })
    assert duplicate.status_code == 409

    history = client.post(f"/patients/{first.json()['id']}/clinical-history", headers=admin_headers, json={
        "document_type": "PA", "document_id": "AB123456",
    })
    assert history.status_code == 200, history.text
    assert history.json()["document_type"] == "PA"
    patient = client.get(f"/patients/{first.json()['id']}", headers=admin_headers)
    assert patient.json()["document_type"] == "PA"
    assert patient.json()["document_number"] == "AB123456"


def test_consent_template_upload_extracts_text_and_keeps_original(client, admin_headers):
    content = "CONSENTIMIENTO INFORMADO\nPaciente: {paciente}\nTratamiento: {tratamiento}\nRiesgos y alternativas explicados."
    response = client.post(
        "/consent-templates", headers=admin_headers,
        data={"name": "Consentimiento de prueba"},
        files={"file": ("consentimiento.txt", content.encode(), "text/plain")},
    )
    assert response.status_code == 200, response.text
    template = response.json()
    assert template["content"] == content
    assert template["original_filename"] == "consentimiento.txt"

    listing = client.get("/consent-templates", headers=admin_headers)
    assert any(item["id"] == template["id"] for item in listing.json())
    original = client.get(f"/consent-templates/{template['id']}/file", headers=admin_headers)
    assert original.status_code == 200
    assert original.content == content.encode()
    editable = client.get(f"/consent-templates/{template['id']}/editable-file", headers=admin_headers)
    assert editable.status_code == 200
    assert editable.content.startswith(b"PK")
    assert template["editable_filename"] == "consentimiento-editable.docx"
    assert template["conversion_status"] == "converted"

    invalid = client.post(
        "/consent-templates", headers=admin_headers,
        files={"file": ("falso.pdf", b"not a pdf", "application/pdf")},
    )
    assert invalid.status_code == 422


def test_pdf_consent_keeps_original_and_stores_converted_docx(client, admin_headers, monkeypatch):
    import main

    converted_text = "Consentimiento extraído automáticamente desde el documento PDF para edición."
    monkeypatch.setattr(main, "convert_pdf_to_docx", lambda _contents: (converted_text, main.create_editable_docx(converted_text)))
    response = client.post(
        "/consent-templates", headers=admin_headers,
        files={"file": ("cirugia.pdf", b"%PDF-1.7\noriginal-inmutable", "application/pdf")},
    )
    assert response.status_code == 200, response.text
    template = response.json()
    assert template["content"] == converted_text
    assert template["original_filename"] == "cirugia.pdf"
    assert template["editable_filename"] == "cirugia-editable.docx"
    original = client.get(f"/consent-templates/{template['id']}/file", headers=admin_headers)
    editable = client.get(f"/consent-templates/{template['id']}/editable-file", headers=admin_headers)
    assert original.content == b"%PDF-1.7\noriginal-inmutable"
    assert editable.status_code == 200
    assert editable.content.startswith(b"PK")


def test_cups_catalog_search_and_odontology_filter(client, admin_headers):
    response = client.get("/catalogs/cups?search=890203&category=odontology", headers=admin_headers)
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["total"] == 1
    assert payload["items"][0]["code"] == "890203"
    assert "ODONTOLOGIA GENERAL" in payload["items"][0]["name"]
    assert payload["items"][0]["priority"] is True

    dental = client.get("/catalogs/cups?search=diente&category=odontology&limit=10&page=2", headers=admin_headers)
    assert dental.status_code == 200, dental.text
    dental_payload = dental.json()
    assert dental_payload["page"] == 2
    assert dental_payload["limit"] == 10
    assert dental_payload["total_pages"] >= 2
    assert all("DIENTE" in item["name"] for item in dental_payload["items"])

    nasal = client.get("/catalogs/cups?search=hueso%20nasal&category=odontology", headers=admin_headers)
    assert nasal.status_code == 200
    assert nasal.json()["total"] == 0

    rejected = client.get("/catalogs/cups?category=invalid", headers=admin_headers)
    assert rejected.status_code == 422


def test_clinical_history_persists_anamnesis_and_cups(client, admin_headers):
    patient = client.post("/patients/", headers=admin_headers, json={"first_name": "Anamnesis", "first_surname": "Prueba"}).json()
    response = client.post(f"/patients/{patient['id']}/clinical-history", headers=admin_headers, json={
        "current_illness": "Dolor de tres días de evolución.",
        "systems_review": "Sin hallazgos cardiovasculares relevantes.",
        "cups_code": "890203",
        "cups_name": "CONSULTA DE PRIMERA VEZ POR ODONTOLOGIA GENERAL",
        "diagnosis_type": "Impresión diagnóstica",
    })
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["cups_code"] == "890203"
    assert payload["current_illness"].startswith("Dolor")
