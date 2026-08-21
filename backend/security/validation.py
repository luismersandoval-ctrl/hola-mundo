import base64
import json
import math
import re
from datetime import date
from pathlib import Path


PERMANENT_TEETH = {str(quadrant * 10 + tooth) for quadrant in range(1, 5) for tooth in range(1, 9)}
TEMPORARY_TEETH = {str(quadrant * 10 + tooth) for quadrant in range(5, 9) for tooth in range(1, 6)}
ALL_TEETH = PERMANENT_TEETH | TEMPORARY_TEETH
SURFACES = {"vestibular", "lingual", "mesial", "distal", "oclusal"}
SURFACE_STATES = {"sano", "caries", "obturacion", "sellante", "fractura"}
TOOTH_STATES = {"normal", "ausente", "extraccion"}
ENDO_STATES = {"none", "endodonciado", "conducto_pendiente"}
IMPLANT_STATES = {"none", "implante_indicado", "implante_existente"}
FEATURES = {
    "furca_1", "furca_2", "furca_3", "movilidad_1", "movilidad_2", "movilidad_3",
    "en_erupcion", "sin_erupcionar", "impactado", "incluido", "inclinado",
    "lingualizado", "rotado", "supernumerario",
}


def parse_json_object(value: str, label: str, max_items: int = 100):
    try:
        parsed = json.loads(value)
    except (TypeError, json.JSONDecodeError) as exc:
        raise ValueError(f"{label} no contiene JSON válido.") from exc
    if not isinstance(parsed, dict) or len(parsed) > max_items:
        raise ValueError(f"{label} debe ser un objeto con un tamaño permitido.")
    return parsed


def validate_odontogram_json(value: str) -> str:
    parsed = parse_json_object(value, "El odontograma", 52)
    for tooth, detail in parsed.items():
        if str(tooth) not in ALL_TEETH or not isinstance(detail, dict):
            raise ValueError("El odontograma contiene una pieza no válida.")
        allowed = {"toothState", "endodonticState", "implantState", "hasCrown", "features", "surfaces"}
        if set(detail) - allowed:
            raise ValueError("El odontograma contiene campos no permitidos.")
        if detail.get("toothState", "normal") not in TOOTH_STATES:
            raise ValueError("El odontograma contiene un estado dental no válido.")
        if detail.get("endodonticState", "none") not in ENDO_STATES or detail.get("implantState", "none") not in IMPLANT_STATES:
            raise ValueError("El odontograma contiene un estado clínico no válido.")
        if not isinstance(detail.get("hasCrown", False), bool):
            raise ValueError("El indicador de corona no es válido.")
        features = detail.get("features", [])
        if not isinstance(features, list) or len(features) > len(FEATURES) or any(item not in FEATURES for item in features):
            raise ValueError("El odontograma contiene hallazgos no válidos.")
        surfaces = detail.get("surfaces", {})
        if not isinstance(surfaces, dict) or set(surfaces) - SURFACES or any(item not in SURFACE_STATES for item in surfaces.values()):
            raise ValueError("El odontograma contiene superficies no válidas.")
    return value


def _finite_range(value, minimum, maximum):
    return isinstance(value, (int, float)) and math.isfinite(value) and minimum <= value <= maximum


def validate_periodontogram_json(value: str) -> str:
    parsed = parse_json_object(value, "El periodontograma", 32)
    for tooth, detail in parsed.items():
        if str(tooth) not in PERMANENT_TEETH or not isinstance(detail, dict):
            raise ValueError("El periodontograma contiene una pieza no válida.")
        if not _finite_range(detail.get("mobility", 0), 0, 3) or not _finite_range(detail.get("furcation", 0), 0, 3):
            raise ValueError("Movilidad o furca fuera del rango permitido.")
        allowed = {"absent", "implant", "mobility", "furcation", "prognosis", "vestibular"}
        if set(detail) - allowed or not isinstance(detail.get("absent", False), bool) or not isinstance(detail.get("implant", False), bool):
            raise ValueError("El periodontograma contiene campos no permitidos.")
        if detail.get("prognosis", "good") not in {"good", "guarded", "poor"}:
            raise ValueError("El pronóstico periodontal no es válido.")
        side = detail.get("vestibular", {})
        if not isinstance(side, dict):
            raise ValueError("Los datos periodontales no son válidos.")
        if set(side) - {"bone", "gingiva", "gingival_width", "bleeding", "suppuration", "plaque"}:
            raise ValueError("Los datos periodontales contienen campos no permitidos.")
        for key in ("bone", "gingiva", "gingival_width"):
            values = side.get(key, [])
            if not isinstance(values, list) or len(values) != 3 or any(not _finite_range(item, 0, 15) for item in values):
                raise ValueError("Las mediciones periodontales están fuera del rango permitido.")
        for key in ("bleeding", "suppuration", "plaque"):
            values = side.get(key, [])
            if not isinstance(values, list) or len(values) != 3 or any(not isinstance(item, bool) for item in values):
                raise ValueError("Los indicadores periodontales no son válidos.")
    return value


def validate_medications_json(value: str) -> str:
    try:
        medications = json.loads(value)
    except (TypeError, json.JSONDecodeError) as exc:
        raise ValueError("La fórmula no contiene JSON válido.") from exc
    if not isinstance(medications, list) or not 1 <= len(medications) <= 30:
        raise ValueError("La fórmula debe contener entre 1 y 30 medicamentos.")
    allowed = {"name", "presentation", "dose", "route", "frequency", "duration", "quantity", "instructions"}
    required = {"name", "dose", "frequency", "duration"}
    for item in medications:
        if not isinstance(item, dict) or set(item) - allowed or not required.issubset(item):
            raise ValueError("La fórmula contiene campos no permitidos.")
        if any(not str(item[field]).strip() or len(str(item[field])) > 300 for field in required):
            raise ValueError("Completa los datos requeridos de cada medicamento.")
        if any(len(str(field_value)) > 1000 for field_value in item.values()):
            raise ValueError("Un campo del medicamento supera el tamaño permitido.")
    return value


def validate_surfaces_json(value: str) -> str:
    try:
        surfaces = json.loads(value)
    except (TypeError, json.JSONDecodeError) as exc:
        raise ValueError("La relación con el odontograma no contiene JSON válido.") from exc
    if not isinstance(surfaces, list) or len(surfaces) > 5:
        raise ValueError("La relación con el odontograma no es válida.")
    for item in surfaces:
        if not isinstance(item, dict) or set(item) != {"surface", "state"} or item["surface"] not in SURFACES or item["state"] not in SURFACE_STATES:
            raise ValueError("La relación contiene una superficie no válida.")
    return value


def validate_birth_date(value: str) -> str:
    if not value:
        return value
    try:
        parsed = date.fromisoformat(value)
    except ValueError as exc:
        raise ValueError("La fecha debe usar el formato AAAA-MM-DD.") from exc
    today = date.today()
    if parsed > today or parsed.year < today.year - 120:
        raise ValueError("La fecha de nacimiento no es válida.")
    return value


def validate_signature(value: str) -> str:
    prefix = "data:image/png;base64,"
    if not value.startswith(prefix):
        raise ValueError("La firma debe ser una imagen PNG válida.")
    try:
        binary = base64.b64decode(value[len(prefix):], validate=True)
    except (ValueError, base64.binascii.Error) as exc:
        raise ValueError("La firma contiene datos inválidos.") from exc
    if not 50 <= len(binary) <= 1_000_000 or not binary.startswith(b"\x89PNG\r\n\x1a\n"):
        raise ValueError("La firma PNG no es válida o supera el tamaño permitido.")
    return value


FILE_SIGNATURES = {
    ".jpg": lambda data: data.startswith(b"\xff\xd8\xff"),
    ".jpeg": lambda data: data.startswith(b"\xff\xd8\xff"),
    ".png": lambda data: data.startswith(b"\x89PNG\r\n\x1a\n"),
    ".webp": lambda data: len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP",
    ".pdf": lambda data: data.startswith(b"%PDF-"),
    ".dcm": lambda data: len(data) >= 132 and data[128:132] == b"DICM",
}


def validate_uploaded_file(filename: str, content_type: str, contents: bytes):
    clean_name = Path(filename or "study").name
    if not clean_name or len(clean_name) > 255 or "\x00" in clean_name or re.search(r"[\x00-\x1f\x7f]", clean_name):
        raise ValueError("El nombre del archivo no es válido.")
    extension = Path(clean_name).suffix.lower()
    checker = FILE_SIGNATURES.get(extension)
    if checker is None or not checker(contents):
        raise ValueError("El contenido real del archivo no corresponde con un formato permitido.")
    expected_types = {
        ".jpg": {"image/jpeg"}, ".jpeg": {"image/jpeg"}, ".png": {"image/png"},
        ".webp": {"image/webp"}, ".pdf": {"application/pdf"},
        ".dcm": {"application/dicom", "application/octet-stream"},
    }
    if content_type not in expected_types[extension]:
        raise ValueError("El tipo MIME no corresponde con el archivo cargado.")
    return clean_name, extension
