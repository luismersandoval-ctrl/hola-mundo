from sqlalchemy import text


ALLOWED_MIGRATION_TABLES = {
    "appointments", "users", "clinics", "registration_otps", "patients", "payments",
    "inventory_items", "clinical_histories", "treatments", "clinical_evolutions", "cash_closings",
}

ALLOWED_MIGRATION_COLUMNS = {
    "status", "duration_minutes", "professional", "professional_user_id", "room_id", "room_name",
    "email", "clinic_id", "full_name", "title", "gender", "active", "owner_user_id", "clinic_name",
    "first_name", "second_name", "first_surname", "second_surname", "phone_country_code", "assigned_user_id",
    "document_type", "document_number", "birth_date", "blood_type", "marital_status", "birth_place",
    "origin_country", "ethnicity", "education_level", "landline", "residence_country", "state", "city",
    "residential_zone", "address", "neighborhood", "occupation", "occupation_code", "insurer_type",
    "insurer_name", "affiliation_type", "coverage", "companion_name", "companion_phone", "companion_email",
    "responsible_name", "responsible_phone", "responsible_relationship", "document_id", "emergency_contact", "emergency_relationship",
    "emergency_phone", "insurance", "family_history", "dental_history", "oral_hygiene", "vital_signs",
    "diagnosis", "catalog_item_id", "odontogram_reference", "odontogram_surfaces", "base_amount",
    "discount_percent", "treatment_id", "technique", "instruments", "anesthesia", "complications", "observations",
    "business_date",
}

ALLOWED_COLUMN_DEFINITIONS = {
    "VARCHAR", "VARCHAR DEFAULT ''", "VARCHAR DEFAULT '+57'", "VARCHAR DEFAULT 'pending'",
    "VARCHAR DEFAULT 'OdontoSpace' NOT NULL", "INTEGER", "INTEGER DEFAULT 1", "INTEGER DEFAULT 30",
    "FLOAT DEFAULT 0", "TEXT DEFAULT ''", "TEXT DEFAULT '[]'", "DATE",
}


def table_columns(connection, table: str):
    if table not in ALLOWED_MIGRATION_TABLES:
        raise RuntimeError("Tabla de migración no autorizada.")
    return {row[1] for row in connection.execute(text(f"PRAGMA table_info({table})"))}


def add_column(connection, table: str, column: str, definition: str):
    if table not in ALLOWED_MIGRATION_TABLES or column not in ALLOWED_MIGRATION_COLUMNS or definition not in ALLOWED_COLUMN_DEFINITIONS:
        raise RuntimeError("Migración de columna no autorizada.")
    connection.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {definition}"))


def create_index(connection, index: str, table: str, column: str, unique: bool = False):
    expected = f"ix_{table}_{column}"
    if index != expected or table not in ALLOWED_MIGRATION_TABLES or column not in ALLOWED_MIGRATION_COLUMNS:
        raise RuntimeError("Índice de migración no autorizado.")
    qualifier = "UNIQUE " if unique else ""
    connection.execute(text(f"CREATE {qualifier}INDEX IF NOT EXISTS {index} ON {table} ({column})"))
