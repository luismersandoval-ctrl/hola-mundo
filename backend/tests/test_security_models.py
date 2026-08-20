import json
from datetime import datetime

import pytest
from pydantic import ValidationError

import schemas
from security.validation import validate_uploaded_file


def test_unknown_fields_and_mass_assignment_are_rejected():
    with pytest.raises(ValidationError):
        schemas.PatientCreate(first_name="Ana", clinic_id=999, role="admin")


@pytest.mark.parametrize("payload", ["x\x00y", "x\x07y"])
def test_null_and_control_characters_are_rejected(payload):
    with pytest.raises(ValidationError):
        schemas.PatientCreate(first_name=payload)


def test_unicode_apostrophe_and_sql_text_remain_literal():
    patient = schemas.PatientCreate(first_name="María", first_surname="O'Connor")
    history = schemas.ClinicalHistoryCreate(motivo_consulta="Dolor' OR 1=1 -- sin fiebre")
    assert patient.first_surname == "O'Connor"
    assert "OR 1=1" in history.motivo_consulta


@pytest.mark.parametrize("birth_date", ["2999-01-01", "1800-01-01", "2026-02-30"])
def test_invalid_birth_dates_are_rejected(birth_date):
    with pytest.raises(ValidationError):
        schemas.PatientCreate(first_name="Ana", birth_date=birth_date)


@pytest.mark.parametrize("duration", [0, 14, 16, 481])
def test_appointment_duration_requires_15_minute_blocks(duration):
    with pytest.raises(ValidationError):
        schemas.AppointmentCreate(date=datetime(2026, 8, 20, 8), reason="Control", duration_minutes=duration)


def test_structured_clinical_json_is_validated():
    valid = {"11": {"surfaces": {"oclusal": "caries"}, "features": []}}
    assert schemas.OdontogramaCreate(data=json.dumps(valid)).data
    with pytest.raises(ValidationError):
        schemas.OdontogramaCreate(data=json.dumps({"99": valid["11"]}))
    with pytest.raises(ValidationError):
        schemas.PrescriptionCreate(medications='[{"name":"x"}]')


def test_numeric_ranges_are_finite_and_coherent():
    with pytest.raises(ValidationError):
        schemas.PaymentCreate(concept="Abono", amount=float("nan"))
    with pytest.raises(ValidationError):
        schemas.InventoryItemCreate(name="Guantes", min_stock=10, max_stock=5)


def test_file_magic_and_mime_are_authoritative():
    name, extension = validate_uploaded_file("rx.png", "image/png", b"\x89PNG\r\n\x1a\ncontent")
    assert (name, extension) == ("rx.png", ".png")
    with pytest.raises(ValueError):
        validate_uploaded_file("rx.png", "image/png", b"<script>alert(1)</script>")
    with pytest.raises(ValueError):
        validate_uploaded_file("rx.png", "application/pdf", b"\x89PNG\r\n\x1a\ncontent")
