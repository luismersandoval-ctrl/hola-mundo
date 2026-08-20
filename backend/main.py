from fastapi import FastAPI, Depends, File, Form, HTTPException, Query, Request, UploadFile, status
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from datetime import date, timedelta, datetime
from typing import List
import os
import json
import hashlib
import hmac
import re
import secrets
import smtplib
import uuid
from email.message import EmailMessage
from pathlib import Path
from zoneinfo import ZoneInfo
from dotenv import load_dotenv
from pydantic import ValidationError

DIAGNOSTIC_UPLOAD_ROOT = Path(os.environ.get("DIAGNOSTIC_UPLOAD_ROOT", Path(__file__).resolve().parent / "uploads" / "diagnostic-images")).resolve()
DIAGNOSTIC_UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
ALLOWED_DIAGNOSTIC_TYPES = {"image/jpeg", "image/png", "image/webp", "application/pdf", "application/dicom", "application/octet-stream"}
MAX_DIAGNOSTIC_FILE_SIZE = 25 * 1024 * 1024

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

import models, schemas, database, auth
from security.validation import validate_uploaded_file
from security.sql import add_column, create_index, table_columns

models.Base.metadata.create_all(bind=database.engine)

def migrate_existing_database():
    """Small SQLite compatibility migration for installations created before agenda metadata."""
    with database.engine.begin() as connection:
        columns = table_columns(connection, "appointments")
        additions = {
            "status": "VARCHAR DEFAULT 'pending'",
            "duration_minutes": "INTEGER DEFAULT 30",
            "professional": "VARCHAR DEFAULT ''",
            "professional_user_id": "INTEGER",
            "room_id": "INTEGER",
            "room_name": "VARCHAR DEFAULT ''",
        }
        for column, definition in additions.items():
            if column not in columns:
                add_column(connection, "appointments", column, definition)
        user_columns = table_columns(connection, "users")
        if "email" not in user_columns:
            add_column(connection, "users", "email", "VARCHAR")
        if "clinic_id" not in user_columns:
            add_column(connection, "users", "clinic_id", "INTEGER")
        if "full_name" not in user_columns:
            add_column(connection, "users", "full_name", "VARCHAR DEFAULT ''")
        if "title" not in user_columns:
            add_column(connection, "users", "title", "VARCHAR DEFAULT ''")
        if "gender" not in user_columns:
            add_column(connection, "users", "gender", "VARCHAR DEFAULT ''")
        if "active" not in user_columns:
            add_column(connection, "users", "active", "INTEGER DEFAULT 1")
        create_index(connection, "ix_users_email", "users", "email", unique=True)
        clinic_columns = table_columns(connection, "clinics")
        if "owner_user_id" not in clinic_columns:
            add_column(connection, "clinics", "owner_user_id", "INTEGER")
        create_index(connection, "ix_clinics_owner_user_id", "clinics", "owner_user_id")
        otp_columns = table_columns(connection, "registration_otps")
        if "clinic_name" not in otp_columns:
            add_column(connection, "registration_otps", "clinic_name", "VARCHAR DEFAULT 'OdontoSpace' NOT NULL")
        for table in ("patients", "payments", "inventory_items"):
            existing_columns = table_columns(connection, table)
            if "clinic_id" not in existing_columns:
                add_column(connection, table, "clinic_id", "INTEGER")
            create_index(connection, f"ix_{table}_clinic_id", table, "clinic_id")
        payment_columns = table_columns(connection, "payments")
        if "business_date" not in payment_columns:
            add_column(connection, "payments", "business_date", "DATE")
            connection.execute(text("UPDATE payments SET business_date = DATE(created_at) WHERE business_date IS NULL"))
        create_index(connection, "ix_payments_business_date", "payments", "business_date")
        patient_columns = table_columns(connection, "patients")
        if "first_name" not in patient_columns:
            add_column(connection, "patients", "first_name", "VARCHAR DEFAULT ''")
        if "second_name" not in patient_columns:
            add_column(connection, "patients", "second_name", "VARCHAR DEFAULT ''")
        if "first_surname" not in patient_columns:
            add_column(connection, "patients", "first_surname", "VARCHAR DEFAULT ''")
            connection.execute(text("UPDATE patients SET first_surname = second_name WHERE second_name IS NOT NULL AND second_name != ''"))
        if "phone_country_code" not in patient_columns:
            add_column(connection, "patients", "phone_country_code", "VARCHAR DEFAULT '+57'")
        connection.execute(text("UPDATE patients SET first_name = name WHERE (first_name IS NULL OR first_name = '') AND name IS NOT NULL"))
        if "assigned_user_id" not in patient_columns:
            add_column(connection, "patients", "assigned_user_id", "INTEGER")
        if "gender" not in patient_columns:
            add_column(connection, "patients", "gender", "VARCHAR DEFAULT ''")
        patient_additions = {
            "second_surname": "VARCHAR DEFAULT ''", "document_type": "VARCHAR DEFAULT ''", "document_number": "VARCHAR DEFAULT ''",
            "birth_date": "VARCHAR DEFAULT ''", "blood_type": "VARCHAR DEFAULT ''", "marital_status": "VARCHAR DEFAULT ''",
            "birth_place": "VARCHAR DEFAULT ''", "origin_country": "VARCHAR DEFAULT ''", "ethnicity": "VARCHAR DEFAULT ''",
            "education_level": "VARCHAR DEFAULT ''", "landline": "VARCHAR DEFAULT ''", "residence_country": "VARCHAR DEFAULT ''",
            "state": "VARCHAR DEFAULT ''", "city": "VARCHAR DEFAULT ''", "residential_zone": "VARCHAR DEFAULT ''",
            "address": "VARCHAR DEFAULT ''", "neighborhood": "VARCHAR DEFAULT ''", "occupation": "VARCHAR DEFAULT ''",
            "occupation_code": "VARCHAR DEFAULT ''", "insurer_type": "VARCHAR DEFAULT ''", "insurer_name": "VARCHAR DEFAULT ''",
            "affiliation_type": "VARCHAR DEFAULT ''", "coverage": "VARCHAR DEFAULT ''", "companion_name": "VARCHAR DEFAULT ''",
            "companion_phone": "VARCHAR DEFAULT ''", "companion_email": "VARCHAR DEFAULT ''", "responsible_name": "VARCHAR DEFAULT ''",
            "responsible_phone": "VARCHAR DEFAULT ''", "responsible_relationship": "VARCHAR DEFAULT ''",
        }
        for column, definition in patient_additions.items():
            if column not in patient_columns:
                add_column(connection, "patients", column, definition)
        create_index(connection, "ix_patients_assigned_user_id", "patients", "assigned_user_id")
        history_columns = table_columns(connection, "clinical_histories")
        history_additions = {
            "document_id": "VARCHAR DEFAULT ''", "birth_date": "VARCHAR DEFAULT ''", "address": "VARCHAR DEFAULT ''",
            "occupation": "VARCHAR DEFAULT ''", "emergency_contact": "VARCHAR DEFAULT ''", "emergency_relationship": "VARCHAR DEFAULT ''", "emergency_phone": "VARCHAR DEFAULT ''",
            "blood_type": "VARCHAR DEFAULT ''", "insurance": "VARCHAR DEFAULT ''", "family_history": "TEXT DEFAULT ''",
            "dental_history": "TEXT DEFAULT ''", "oral_hygiene": "TEXT DEFAULT ''", "vital_signs": "TEXT DEFAULT ''", "diagnosis": "TEXT DEFAULT ''",
        }
        for column, definition in history_additions.items():
            if column not in history_columns:
                add_column(connection, "clinical_histories", column, definition)
        treatment_columns = table_columns(connection, "treatments")
        if "catalog_item_id" not in treatment_columns:
            add_column(connection, "treatments", "catalog_item_id", "INTEGER")
        if "odontogram_reference" not in treatment_columns:
            add_column(connection, "treatments", "odontogram_reference", "TEXT DEFAULT ''")
        if "odontogram_surfaces" not in treatment_columns:
            add_column(connection, "treatments", "odontogram_surfaces", "TEXT DEFAULT '[]'")
        if "base_amount" not in treatment_columns:
            add_column(connection, "treatments", "base_amount", "FLOAT DEFAULT 0")
            connection.execute(text("UPDATE treatments SET base_amount = amount WHERE base_amount = 0"))
        if "discount_percent" not in treatment_columns:
            add_column(connection, "treatments", "discount_percent", "FLOAT DEFAULT 0")
        evolution_columns = table_columns(connection, "clinical_evolutions")
        if "treatment_id" not in evolution_columns:
            add_column(connection, "clinical_evolutions", "treatment_id", "INTEGER")
        evolution_additions = {
            "technique": "TEXT DEFAULT ''", "instruments": "TEXT DEFAULT ''", "anesthesia": "TEXT DEFAULT ''",
            "complications": "TEXT DEFAULT ''", "observations": "TEXT DEFAULT ''",
        }
        for column, definition in evolution_additions.items():
            if column not in evolution_columns:
                add_column(connection, "clinical_evolutions", column, definition)
        create_index(connection, "ix_clinical_evolutions_treatment_id", "clinical_evolutions", "treatment_id")

        default_clinic_id = connection.execute(text("SELECT id FROM clinics ORDER BY id LIMIT 1")).scalar()
        if default_clinic_id is None:
            connection.execute(text("INSERT INTO clinics (name, created_at) VALUES ('Clínica principal', CURRENT_TIMESTAMP)"))
            default_clinic_id = connection.execute(text("SELECT id FROM clinics ORDER BY id LIMIT 1")).scalar()
        connection.execute(text("UPDATE users SET clinic_id = :clinic_id WHERE clinic_id IS NULL"), {"clinic_id": default_clinic_id})
        connection.execute(text("UPDATE patients SET clinic_id = :clinic_id WHERE clinic_id IS NULL"), {"clinic_id": default_clinic_id})
        connection.execute(text("UPDATE payments SET clinic_id = :clinic_id WHERE clinic_id IS NULL"), {"clinic_id": default_clinic_id})
        connection.execute(text("UPDATE inventory_items SET clinic_id = :clinic_id WHERE clinic_id IS NULL"), {"clinic_id": default_clinic_id})
        connection.execute(text("""
            UPDATE clinics
            SET owner_user_id = (
                SELECT users.id FROM users
                WHERE users.clinic_id = clinics.id AND users.role = 'admin'
                ORDER BY users.id LIMIT 1
            )
            WHERE owner_user_id IS NULL
        """))

migrate_existing_database()

app = FastAPI(title="OdontoSpace API")

MAX_STANDARD_REQUEST_SIZE = 2 * 1024 * 1024
MAX_MULTIPART_REQUEST_SIZE = MAX_DIAGNOSTIC_FILE_SIZE + 1024 * 1024


class SecurityBoundaryMiddleware:
    """Applies request limits without consuming request bodies or logging clinical data."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        headers = {key.lower(): value for key, value in scope.get("headers", [])}
        content_type = headers.get(b"content-type", b"").decode("latin-1").lower()
        maximum = MAX_MULTIPART_REQUEST_SIZE if content_type.startswith("multipart/form-data") else MAX_STANDARD_REQUEST_SIZE
        raw_length = headers.get(b"content-length")
        if raw_length:
            try:
                if int(raw_length) > maximum:
                    await JSONResponse(status_code=413, content={"detail": "La solicitud supera el tamaño permitido."})(scope, receive, send)
                    return
            except ValueError:
                await JSONResponse(status_code=400, content={"detail": "La longitud de la solicitud no es válida."})(scope, receive, send)
                return

        async def secure_send(message):
            if message["type"] == "http.response.start":
                response_headers = list(message.get("headers", []))
                response_headers.extend([
                    (b"x-content-type-options", b"nosniff"),
                    (b"x-frame-options", b"DENY"),
                    (b"referrer-policy", b"same-origin"),
                    (b"permissions-policy", b"camera=(), microphone=(), geolocation=()"),
                    (b"cache-control", b"no-store" if scope.get("path", "").startswith(("/token", "/patients", "/reports")) else b"private, no-cache"),
                ])
                message["headers"] = response_headers
            await send(message)

        await self.app(scope, receive, secure_send)


app.add_middleware(SecurityBoundaryMiddleware)

DEFAULT_CORS_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173,https://heave-galleria-impatient.ngrok-free.dev"
allowed_origins = [origin.strip() for origin in os.environ.get("CORS_ALLOWED_ORIGINS", DEFAULT_CORS_ORIGINS).split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "ngrok-skip-browser-warning"],
)

# Seed admin user on startup if not exists
def seed_admin():
    db = database.SessionLocal()
    admin_user = auth.get_user_by_username(db, "admin")
    admin_password = os.environ.get("ADMIN_PASSWORD")
    if not admin_user and admin_password:
        hashed_pw = auth.get_password_hash(admin_password)
        clinic = db.query(models.Clinic).order_by(models.Clinic.id).first()
        new_admin = models.User(username="admin", hashed_password=hashed_pw, role="admin", clinic_id=clinic.id)
        db.add(new_admin)
        db.flush()
        if clinic.owner_user_id is None:
            clinic.owner_user_id = new_admin.id
        db.commit()
    db.close()

seed_admin()

EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
OTP_EXPIRE_MINUTES = 10
OTP_MAX_ATTEMPTS = 5

def normalize_email(value: str) -> str:
    return value.strip().lower()

def validate_registration(email: str, password: str):
    if not EMAIL_PATTERN.fullmatch(email):
        raise HTTPException(status_code=422, detail="Ingresa un correo electrónico válido.")
    password_errors = []
    if len(password) < 10:
        password_errors.append("mínimo 10 caracteres")
    if not re.search(r"[A-Z]", password):
        password_errors.append("una letra mayúscula")
    if not re.search(r"[a-z]", password):
        password_errors.append("una letra minúscula")
    if not re.search(r"\d", password):
        password_errors.append("un número")
    if not re.search(r"[^A-Za-z0-9]", password):
        password_errors.append("un carácter especial")
    if password_errors:
        raise HTTPException(status_code=422, detail="La contraseña debe contener " + ", ".join(password_errors) + ".")

def validate_clinic_name(value: str) -> str:
    name = " ".join(value.strip().split())
    if len(name) < 3 or len(name) > 100:
        raise HTTPException(status_code=422, detail="El nombre de la clínica debe tener entre 3 y 100 caracteres.")
    return name

STAFF_ROLES = {"dentist", "specialist", "administrative"}
CLINICAL_ROLES = {"admin", "dentist", "specialist"}

def require_admin(current_user: models.User):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Esta acción requiere permisos de administrador.")

def require_clinic_owner(current_user: models.User):
    if not current_user.is_clinic_owner:
        raise HTTPException(status_code=403, detail="Esta sección está disponible únicamente para el propietario de la clínica.")

def require_clinical_write(current_user: models.User):
    if current_user.role not in CLINICAL_ROLES:
        raise HTTPException(status_code=403, detail="Tu rol permite consultar la historia clínica, pero no modificarla.")

def require_management(current_user: models.User):
    if current_user.role not in {"admin", "administrative"}:
        raise HTTPException(status_code=403, detail="Esta sección está reservada para administración.")

def otp_hash(email: str, code: str) -> str:
    secret = auth.SECRET_KEY.encode("utf-8")
    return hmac.new(secret, f"{email}:{code}".encode("utf-8"), hashlib.sha256).hexdigest()

def otp_email_template(code: str) -> str:
    return f"""<!doctype html>
<html lang="es"><body style="margin:0;background:#f4f4f5;font-family:Arial,sans-serif;color:#18181b">
  <div style="max-width:520px;margin:40px auto;background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e4e4e7">
    <h1 style="margin:0;color:#2563eb;font-size:26px">OdontoSpace</h1>
    <p style="color:#52525b;line-height:1.6">Usa el siguiente código para confirmar tu correo y completar el registro:</p>
    <div style="margin:28px 0;padding:18px;text-align:center;background:#eff6ff;border-radius:12px;color:#1d4ed8;font-size:34px;font-weight:700;letter-spacing:10px">{code}</div>
    <p style="color:#71717a;font-size:14px;line-height:1.5">El código vence en {OTP_EXPIRE_MINUTES} minutos. Si no solicitaste esta cuenta, puedes ignorar este mensaje.</p>
    <p style="margin-top:28px;color:#a1a1aa;font-size:12px">OdontoSpace · Gestión clínica odontológica</p>
  </div>
</body></html>"""

def send_otp_email(recipient: str, code: str):
    host = os.environ.get("SMTP_HOST")
    user = os.environ.get("SMTP_USER")
    password = os.environ.get("SMTP_PASSWORD")
    sender = os.environ.get("SMTP_FROM", user)
    if not host or not user or not password or not sender:
        raise HTTPException(status_code=503, detail="El servicio de correo aún no está configurado. Contacta al administrador de OdontoSpace.")
    message = EmailMessage()
    message["Subject"] = "Tu código de verificación de OdontoSpace"
    message["From"] = sender
    message["To"] = recipient
    message.set_content(f"Tu código de OdontoSpace es {code}. Vence en {OTP_EXPIRE_MINUTES} minutos.")
    message.add_alternative(otp_email_template(code), subtype="html")
    try:
        port = int(os.environ.get("SMTP_PORT", "587"))
        with smtplib.SMTP(host, port, timeout=15) as smtp:
            if os.environ.get("SMTP_USE_TLS", "true").lower() == "true":
                smtp.starttls()
            smtp.login(user, password)
            smtp.send_message(message)
    except (OSError, smtplib.SMTPException):
        raise HTTPException(status_code=503, detail="No fue posible enviar el código. Inténtalo nuevamente más tarde.")

@app.post("/register/request-otp", response_model=schemas.MessageResponse)
def request_registration_otp(payload: schemas.RegistrationRequest, db: Session = Depends(database.get_db)):
    email = normalize_email(payload.email)
    clinic_name = validate_clinic_name(payload.clinic_name)
    validate_registration(email, payload.password)
    if db.query(models.User).filter(models.User.email == email).first() or db.query(models.User).filter(models.User.username == email).first():
        raise HTTPException(status_code=409, detail="Este correo electrónico ya está registrado.")
    recent = db.query(models.RegistrationOTP).filter(models.RegistrationOTP.email == email, models.RegistrationOTP.used == 0).order_by(models.RegistrationOTP.created_at.desc()).first()
    if recent and recent.created_at.replace(tzinfo=None) > datetime.utcnow() - timedelta(seconds=60):
        raise HTTPException(status_code=429, detail="Espera un minuto antes de solicitar otro código.")
    code = f"{secrets.randbelow(1_000_000):06d}"
    send_otp_email(email, code)
    record = models.RegistrationOTP(email=email, clinic_name=clinic_name, code_hash=otp_hash(email, code), expires_at=datetime.utcnow() + timedelta(minutes=OTP_EXPIRE_MINUTES))
    db.add(record)
    db.commit()
    return {"message": "Enviamos un código de 6 dígitos a tu correo electrónico."}

@app.post("/register/verify", response_model=schemas.MessageResponse)
def verify_registration(payload: schemas.RegistrationVerify, db: Session = Depends(database.get_db)):
    email = normalize_email(payload.email)
    clinic_name = validate_clinic_name(payload.clinic_name)
    validate_registration(email, payload.password)
    if db.query(models.User).filter(models.User.email == email).first() or db.query(models.User).filter(models.User.username == email).first():
        raise HTTPException(status_code=409, detail="Este correo electrónico ya está registrado.")
    if not re.fullmatch(r"\d{6}", payload.code):
        raise HTTPException(status_code=422, detail="El código debe contener exactamente 6 números.")
    record = db.query(models.RegistrationOTP).filter(models.RegistrationOTP.email == email, models.RegistrationOTP.used == 0).order_by(models.RegistrationOTP.created_at.desc()).first()
    if not record:
        raise HTTPException(status_code=400, detail="Solicita un código antes de completar el registro.")
    if record.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="El código venció. Solicita uno nuevo.")
    if record.attempts >= OTP_MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Superaste el número de intentos. Solicita un código nuevo.")
    if not hmac.compare_digest(record.code_hash, otp_hash(email, payload.code)):
        record.attempts += 1
        db.commit()
        remaining = OTP_MAX_ATTEMPTS - record.attempts
        raise HTTPException(status_code=400, detail=f"Código incorrecto. Te quedan {remaining} intentos.")
    if record.clinic_name != clinic_name:
        raise HTTPException(status_code=400, detail="El nombre de la clínica no coincide con la solicitud del código.")
    clinic = models.Clinic(name=clinic_name)
    db.add(clinic)
    db.flush()
    user = models.User(username=email, email=email, full_name=email.split("@")[0], hashed_password=auth.get_password_hash(payload.password), role="admin", clinic_id=clinic.id)
    record.used = 1
    db.add(user)
    db.flush()
    clinic.owner_user_id = user.id
    db.commit()
    return {"message": "Cuenta creada correctamente. Ya puedes iniciar sesión."}

@app.post("/token", response_model=schemas.Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    try:
        credentials = schemas.LoginCredentials(username=form_data.username, password=form_data.password)
    except ValidationError:
        credentials = None
    user = auth.get_user_by_username(db, username=credentials.username) if credentials else None
    if not user or not user.active or not auth.verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo/usuario o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=schemas.User)
async def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

@app.get("/staff/", response_model=List[schemas.Staff])
def list_staff(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    require_clinic_owner(current_user)
    return db.query(models.User).filter(models.User.clinic_id == current_user.clinic_id).order_by(models.User.full_name, models.User.username).all()

@app.get("/professionals/", response_model=List[schemas.Staff])
def list_professionals(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    query = db.query(models.User).filter(models.User.clinic_id == current_user.clinic_id, models.User.role.in_(["dentist", "specialist"]), models.User.active == 1)
    if current_user.role in {"dentist", "specialist"}:
        query = query.filter(models.User.id == current_user.id)
    return query.order_by(models.User.full_name).all()

@app.get("/professionals/{professional_user_id}/availability")
def professional_availability(professional_user_id: int, day: date, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    professional = db.query(models.User).filter(
        models.User.id == professional_user_id,
        models.User.clinic_id == current_user.clinic_id,
        models.User.role.in_(["dentist", "specialist"]),
        models.User.active == 1,
    ).first()
    if not professional:
        raise HTTPException(status_code=404, detail="El profesional no existe o no está activo.")
    day_start = datetime.combine(day, datetime.min.time())
    day_end = day_start + timedelta(days=1)
    appointments = db.query(models.Appointment).join(models.Patient).filter(
        models.Appointment.professional_user_id == professional.id,
        models.Patient.clinic_id == current_user.clinic_id,
        models.Appointment.date >= day_start,
        models.Appointment.date < day_end,
        models.Appointment.status.notin_(["cancelled", "no_show"]),
    ).order_by(models.Appointment.date).all()
    return {
        "professional_user_id": professional.id,
        "date": day.isoformat(),
        "busy": [
            {
                "appointment_id": appointment.id,
                "start": appointment.date.isoformat(),
                "duration_minutes": appointment.duration_minutes or 30,
            }
            for appointment in appointments
        ],
    }

@app.post("/staff/", response_model=schemas.Staff)
def create_staff(payload: schemas.StaffCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    require_clinic_owner(current_user)
    email = normalize_email(payload.email)
    validate_registration(email, payload.password)
    name = " ".join(payload.name.strip().split())
    username = payload.username.strip().lower()
    if len(name) < 3 or len(name) > 100:
        raise HTTPException(status_code=422, detail="El nombre debe tener entre 3 y 100 caracteres.")
    if payload.role not in STAFF_ROLES:
        raise HTTPException(status_code=422, detail="Selecciona un rol válido para el trabajador.")
    if not re.fullmatch(r"[a-z0-9._-]{4,40}", username):
        raise HTTPException(status_code=422, detail="El usuario debe tener entre 4 y 40 caracteres y usar solo letras, números, punto, guion o guion bajo.")
    if db.query(models.User).filter((models.User.email == email) | (models.User.username == username)).first():
        raise HTTPException(status_code=409, detail="El correo o nombre de usuario ya está registrado.")
    if payload.gender not in {"male", "female", "other", "unspecified"}:
        raise HTTPException(status_code=422, detail="Selecciona un género válido.")
    title = {"male": "Dr", "female": "Dra"}.get(payload.gender, "") if payload.role in {"dentist", "specialist"} else ""
    worker = models.User(username=username, email=email, full_name=name, title=title, gender=payload.gender, hashed_password=auth.get_password_hash(payload.password), role=payload.role, clinic_id=current_user.clinic_id, active=1)
    db.add(worker)
    db.commit()
    db.refresh(worker)
    return worker

@app.put("/staff/{staff_id}", response_model=schemas.Staff)
def update_staff(staff_id: int, payload: schemas.StaffUpdate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    require_clinic_owner(current_user)
    worker = db.query(models.User).filter(models.User.id == staff_id, models.User.clinic_id == current_user.clinic_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Trabajador no encontrado.")
    if worker.id == current_user.id and payload.active is False:
        raise HTTPException(status_code=422, detail="No puedes desactivar tu propio usuario administrador.")
    if payload.role is not None:
        if payload.role not in STAFF_ROLES and not (worker.id == current_user.id and payload.role == "admin"):
            raise HTTPException(status_code=422, detail="Selecciona un rol válido.")
        worker.role = payload.role
        worker.title = {"male": "Dr", "female": "Dra"}.get(worker.gender, "") if worker.role in {"dentist", "specialist"} else ""
    if payload.name is not None:
        name = " ".join(payload.name.strip().split())
        if len(name) < 3 or len(name) > 100:
            raise HTTPException(status_code=422, detail="El nombre debe tener entre 3 y 100 caracteres.")
        worker.full_name = name
    if payload.gender is not None:
        if payload.gender not in {"male", "female", "other", "unspecified"}:
            raise HTTPException(status_code=422, detail="Selecciona un género válido.")
        worker.gender = payload.gender
        worker.title = {"male": "Dr", "female": "Dra"}.get(payload.gender, "") if worker.role in {"dentist", "specialist"} else ""
    if payload.active is not None:
        worker.active = int(payload.active)
    db.commit()
    db.refresh(worker)
    return worker

def clinic_patient(db: Session, patient_id: int, current_user: models.User):
    query = db.query(models.Patient).filter(models.Patient.id == patient_id, models.Patient.clinic_id == current_user.clinic_id)
    if current_user.role in {"dentist", "specialist"}:
        query = query.filter(models.Patient.assigned_user_id == current_user.id)
    patient = query.first()
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    return patient

CLINICAL_REQUIRED_FIELDS = {
    "birth_date": "Fecha de nacimiento",
    "motivo_consulta": "Motivo de consulta",
    "alergias": "Alergias (indica “Niega” si no presenta)",
    "enfermedades_sistemicas": "Enfermedades sistémicas (indica “Niega” si no presenta)",
    "medicamentos_actuales": "Medicamentos actuales (indica “Niega” si no consume)",
    "antecedentes_quirurgicos": "Antecedentes quirúrgicos (indica “Niega” si no presenta)",
    "examen_intraoral": "Examen intraoral",
    "diagnosis": "Diagnóstico integral",
}

def clinical_readiness(db: Session, patient: models.Patient):
    history = db.query(models.ClinicalHistory).filter(models.ClinicalHistory.patient_id == patient.id).order_by(models.ClinicalHistory.updated_at.desc()).first()
    missing = []
    for field, label in CLINICAL_REQUIRED_FIELDS.items():
        value = patient.birth_date if field == "birth_date" else getattr(history, field, "") if history else ""
        if not str(value or "").strip():
            missing.append(label)
    return history, missing

def require_complete_clinical_history(db: Session, patient: models.Patient):
    _, missing = clinical_readiness(db, patient)
    if missing:
        raise HTTPException(status_code=409, detail="Completa la historia clínica antes de continuar. Pendiente: " + ", ".join(missing))

DEFAULT_TREATMENTS = [
    "Consulta odontológica",
    "Restauración en resina Clase I", "Restauración en resina Clase II", "Restauración en resina Clase III",
    "Restauración en resina Clase IV", "Restauración en resina Clase V",
    "Periodoncia simple (detartraje y profilaxis)",
    "Periodoncia compleja a campo cerrado", "Periodoncia compleja a campo abierto",
    "Exodoncia simple", "Exodoncia compleja", "Exodoncia de cordales",
    "Prótesis parcial removible acrílica", "Prótesis parcial removible flexible",
    "Corona unitaria metal porcelana", "Corona unitaria en zirconio",
    "Puente fijo metal porcelana", "Puente fijo en zirconio",
    "Corona sobre implante metal porcelana", "Corona sobre implante en zirconio",
    "Endodoncia monoradicular", "Endodoncia biradicular", "Endodoncia multiradicular",
    "Carilla estética en resina", "Carilla estética en cerómero", "Carilla estética en disilicato de litio",
    "Carilla estética en zirconio", "Blanqueamiento dental", "Blanqueamiento interno",
    "Prótesis total", "Incrustación inlay", "Incrustación onlay",
    "Poste o núcleo metálico", "Poste o núcleo en fibra de vidrio",
    "Implante dental",
    "Ortodoncia", "Control de ortodoncia", "Reparación de brackets",
    "Ortodoncia con brackets convencionales", "Ortodoncia con mini brackets",
    "Ortodoncia con brackets autoligados", "Ortodoncia con brackets linguales",
    "Frenilectomía", "Gingivectomía", "Gingivoplastia", "Alargamiento de corona clínica",
    "Urgencia odontológica", "Otros",
]

def ensure_treatment_catalog(db: Session, clinic_id: int):
    existing_names = {item.name.strip().casefold() for item in db.query(models.TreatmentCatalogItem).filter(models.TreatmentCatalogItem.clinic_id == clinic_id).all()}
    missing = [name for name in DEFAULT_TREATMENTS if name.casefold() not in existing_names]
    if missing:
        db.add_all([models.TreatmentCatalogItem(clinic_id=clinic_id, name=name, default_amount=0) for name in missing])
        db.commit()

def ensure_appointment_available(db: Session, professional_user_id: int, start: datetime, duration_minutes: int, exclude_id: int | None = None):
    start = start.replace(tzinfo=None)
    end = start + timedelta(minutes=duration_minutes)
    query = db.query(models.Appointment).filter(models.Appointment.professional_user_id == professional_user_id, models.Appointment.status.notin_(["cancelled", "no_show"]))
    if exclude_id is not None:
        query = query.filter(models.Appointment.id != exclude_id)
    for existing in query.all():
        existing_start = existing.date.replace(tzinfo=None)
        existing_end = existing_start + timedelta(minutes=existing.duration_minutes or 30)
        if start < existing_end and end > existing_start:
            raise HTTPException(status_code=409, detail=f"{existing.professional} no está disponible en ese horario. Tiene una cita de {existing_start.strftime('%H:%M')} a {existing_end.strftime('%H:%M')}.")

def ensure_room_available(db: Session, room_id: int, start: datetime, duration_minutes: int, exclude_id: int | None = None):
    start = start.replace(tzinfo=None)
    end = start + timedelta(minutes=duration_minutes)
    query = db.query(models.Appointment).filter(models.Appointment.room_id == room_id, models.Appointment.status.notin_(["cancelled", "no_show"]))
    if exclude_id is not None:
        query = query.filter(models.Appointment.id != exclude_id)
    for existing in query.all():
        existing_start = existing.date.replace(tzinfo=None)
        existing_end = existing_start + timedelta(minutes=existing.duration_minutes or 30)
        if start < existing_end and end > existing_start:
            raise HTTPException(status_code=409, detail=f"{existing.room_name or 'El consultorio'} ya está ocupado de {existing_start.strftime('%H:%M')} a {existing_end.strftime('%H:%M')}.")

def ensure_default_rooms(db: Session, clinic_id: int):
    if db.query(models.DentalRoom).filter(models.DentalRoom.clinic_id == clinic_id).count() == 0:
        db.add(models.DentalRoom(clinic_id=clinic_id, name="Consultorio 1"))
        db.commit()
    first_room = db.query(models.DentalRoom).filter(models.DentalRoom.clinic_id == clinic_id, models.DentalRoom.active == 1).order_by(models.DentalRoom.id).first()
    if first_room:
        legacy = db.query(models.Appointment).join(models.Patient).filter(models.Patient.clinic_id == clinic_id, models.Appointment.room_id.is_(None)).all()
        for appointment in legacy:
            appointment.room_id = first_room.id
            appointment.room_name = first_room.name
        if legacy:
            db.commit()

@app.get("/rooms/", response_model=List[schemas.DentalRoom])
def list_rooms(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    ensure_default_rooms(db, current_user.clinic_id)
    return db.query(models.DentalRoom).filter(models.DentalRoom.clinic_id == current_user.clinic_id, models.DentalRoom.active == 1).order_by(models.DentalRoom.name).all()

@app.post("/rooms/", response_model=schemas.DentalRoom)
def create_room(payload: schemas.DentalRoomCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    require_admin(current_user)
    name = " ".join(payload.name.strip().split())
    if len(name) < 3:
        raise HTTPException(status_code=422, detail="El nombre del consultorio debe tener al menos 3 caracteres.")
    duplicate = db.query(models.DentalRoom).filter(models.DentalRoom.clinic_id == current_user.clinic_id, func.lower(models.DentalRoom.name) == name.lower()).first()
    if duplicate:
        raise HTTPException(status_code=409, detail="Ya existe un consultorio con ese nombre.")
    room = models.DentalRoom(clinic_id=current_user.clinic_id, name=name)
    db.add(room)
    db.commit()
    db.refresh(room)
    return room

@app.put("/rooms/count", response_model=List[schemas.DentalRoom])
def configure_room_count(payload: schemas.DentalRoomCountUpdate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    require_clinic_owner(current_user)
    if payload.count < 1 or payload.count > 20:
        raise HTTPException(status_code=422, detail="La cantidad de consultorios debe estar entre 1 y 20.")

    rooms = db.query(models.DentalRoom).filter(models.DentalRoom.clinic_id == current_user.clinic_id).order_by(models.DentalRoom.id).all()
    for index, room in enumerate(rooms):
        room.active = int(index < payload.count)
    for index in range(len(rooms), payload.count):
        db.add(models.DentalRoom(clinic_id=current_user.clinic_id, name=f"Consultorio {index + 1}", active=1))
    db.commit()
    return db.query(models.DentalRoom).filter(models.DentalRoom.clinic_id == current_user.clinic_id, models.DentalRoom.active == 1).order_by(models.DentalRoom.id).all()

# Patients CRUD
@app.get("/patients/", response_model=List[schemas.Patient])
def read_patients(skip: int = Query(0, ge=0, le=100_000), limit: int = Query(100, ge=1, le=500), db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    query = db.query(models.Patient).filter(models.Patient.clinic_id == current_user.clinic_id)
    if current_user.role in {"dentist", "specialist"}:
        query = query.filter(models.Patient.assigned_user_id == current_user.id)
    return query.order_by(func.lower(models.Patient.name), models.Patient.id).offset(skip).limit(limit).all()

@app.post("/patients/", response_model=schemas.Patient)
def create_patient(patient: schemas.PatientCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    data = patient.dict()
    first_name = (data.get("first_name") or data.get("name") or "").strip()
    first_surname = (data.get("first_surname") or data.get("second_name") or "").strip()
    if not first_name:
        raise HTTPException(status_code=422, detail="El primer nombre es obligatorio.")
    data["first_name"] = first_name
    data["first_surname"] = first_surname
    data["second_name"] = (data.get("second_name") or "").strip()
    data["second_surname"] = (data.get("second_surname") or "").strip()
    data["phone_country_code"] = (data.get("phone_country_code") or "+57").strip()
    data["name"] = " ".join(part for part in (first_name, data.get("second_name"), first_surname, data.get("second_surname")) if part)
    data["phone"] = (data.get("phone") or "").strip() or None
    data["email"] = (data.get("email") or "").strip().lower() or None
    duplicate_filters = []
    if data["email"]:
        duplicate_filters.append(func.lower(models.Patient.email) == data["email"])
    if data["phone"]:
        duplicate_filters.append(models.Patient.phone == data["phone"])
    if duplicate_filters:
        from sqlalchemy import or_
        duplicate = db.query(models.Patient).filter(
            models.Patient.clinic_id == current_user.clinic_id,
            or_(*duplicate_filters),
        ).first()
        if duplicate:
            raise HTTPException(status_code=409, detail=f"El paciente ya está registrado como {duplicate.name}.")
    if data.get("gender") not in {"", "male", "female", "other", "unspecified"}:
        raise HTTPException(status_code=422, detail="Selecciona un género válido.")
    assigned_user_id = data.pop("assigned_user_id", None)
    if current_user.role in {"dentist", "specialist"}:
        assigned_user_id = current_user.id
    elif assigned_user_id is not None:
        assignee = db.query(models.User).filter(models.User.id == assigned_user_id, models.User.clinic_id == current_user.clinic_id, models.User.role.in_(["dentist", "specialist"]), models.User.active == 1).first()
        if not assignee:
            raise HTTPException(status_code=422, detail="El profesional asignado no es válido.")
    db_patient = models.Patient(**data, assigned_user_id=assigned_user_id, clinic_id=current_user.clinic_id)
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    return db_patient

@app.get("/patients/{patient_id}", response_model=schemas.Patient)
def read_patient(patient_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    return clinic_patient(db, patient_id, current_user)

@app.get("/patients/{patient_id}/diagnostic-images", response_model=List[schemas.PatientDiagnosticImage])
def list_diagnostic_images(patient_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    clinic_patient(db, patient_id, current_user)
    return db.query(models.PatientDiagnosticImage).filter(models.PatientDiagnosticImage.patient_id == patient_id).order_by(models.PatientDiagnosticImage.created_at.desc()).all()

@app.post("/patients/{patient_id}/diagnostic-images", response_model=schemas.PatientDiagnosticImage)
async def upload_diagnostic_image(
    patient_id: int,
    study_type: str = Form(...),
    study_date: str = Form(""),
    title: str = Form(""),
    notes: str = Form(""),
    file: UploadFile = File(...),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    require_clinical_write(current_user)
    clinic_patient(db, patient_id, current_user)
    try:
        metadata = schemas.DiagnosticImageMetadata(study_type=study_type, study_date=study_date, title=title, notes=notes)
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail="Los datos descriptivos del estudio no son válidos.") from exc
    content_type = (file.content_type or "application/octet-stream").lower()
    contents = await file.read(MAX_DIAGNOSTIC_FILE_SIZE + 1)
    if not contents:
        raise HTTPException(status_code=422, detail="El archivo está vacío.")
    if len(contents) > MAX_DIAGNOSTIC_FILE_SIZE:
        raise HTTPException(status_code=413, detail="El archivo supera el límite de 25 MB.")
    try:
        original_filename, extension = validate_uploaded_file(file.filename or "study", content_type, contents)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    patient_directory = DIAGNOSTIC_UPLOAD_ROOT / str(current_user.clinic_id) / str(patient_id)
    patient_directory.mkdir(parents=True, exist_ok=True)
    stored_filename = f"{uuid.uuid4().hex}{extension}"
    destination = patient_directory / stored_filename
    destination.write_bytes(contents)
    record = models.PatientDiagnosticImage(
        patient_id=patient_id, study_type=metadata.study_type, study_date=metadata.study_date, title=metadata.title, notes=metadata.notes,
        original_filename=original_filename, stored_filename=stored_filename, content_type=content_type,
        size_bytes=len(contents), uploaded_by=current_user.display_name,
    )
    db.add(record); db.commit(); db.refresh(record)
    return record

@app.get("/diagnostic-images/{image_id}/file")
def get_diagnostic_image_file(image_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    record = db.query(models.PatientDiagnosticImage).join(models.Patient).filter(models.PatientDiagnosticImage.id == image_id, models.Patient.clinic_id == current_user.clinic_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Imagen diagnóstica no encontrada.")
    clinic_patient(db, record.patient_id, current_user)
    path = DIAGNOSTIC_UPLOAD_ROOT / str(current_user.clinic_id) / str(record.patient_id) / record.stored_filename
    if not path.is_file():
        raise HTTPException(status_code=404, detail="El archivo asociado no está disponible.")
    return FileResponse(path, media_type=record.content_type, filename=record.original_filename)

@app.delete("/diagnostic-images/{image_id}")
def delete_diagnostic_image(image_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    require_clinical_write(current_user)
    record = db.query(models.PatientDiagnosticImage).join(models.Patient).filter(models.PatientDiagnosticImage.id == image_id, models.Patient.clinic_id == current_user.clinic_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Imagen diagnóstica no encontrada.")
    path = DIAGNOSTIC_UPLOAD_ROOT / str(current_user.clinic_id) / str(record.patient_id) / record.stored_filename
    db.delete(record); db.commit()
    if path.is_file():
        path.unlink()
    return {"ok": True}

@app.put("/patients/{patient_id}/assignment", response_model=schemas.Patient)
def assign_patient(patient_id: int, assigned_user_id: int | None = None, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    require_clinic_owner(current_user)
    patient = clinic_patient(db, patient_id, current_user)
    if assigned_user_id is not None:
        assignee = db.query(models.User).filter(models.User.id == assigned_user_id, models.User.clinic_id == current_user.clinic_id, models.User.role.in_(["dentist", "specialist"]), models.User.active == 1).first()
        if not assignee:
            raise HTTPException(status_code=422, detail="Selecciona un profesional clínico activo.")
    patient.assigned_user_id = assigned_user_id
    db.commit()
    db.refresh(patient)
    return patient

# Medical History CRUD
@app.post("/patients/{patient_id}/history", response_model=schemas.MedicalHistory)
def create_medical_history(patient_id: int, history: schemas.MedicalHistoryCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    require_clinical_write(current_user)
    clinic_patient(db, patient_id, current_user)
    db_history = models.MedicalHistory(**history.dict(), patient_id=patient_id)
    db.add(db_history)
    db.commit()
    db.refresh(db_history)
    return db_history

# Clinical History CRUD
@app.get("/patients/{patient_id}/clinical-history", response_model=List[schemas.ClinicalHistory])
def get_clinical_history(patient_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    clinic_patient(db, patient_id, current_user)
    return db.query(models.ClinicalHistory).filter(models.ClinicalHistory.patient_id == patient_id).order_by(models.ClinicalHistory.created_at.desc()).all()

@app.post("/patients/{patient_id}/clinical-history", response_model=schemas.ClinicalHistory)
def create_clinical_history(patient_id: int, history: schemas.ClinicalHistoryCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    require_clinical_write(current_user)
    patient = clinic_patient(db, patient_id, current_user)
    db_history = models.ClinicalHistory(**history.dict(), patient_id=patient_id)
    if history.birth_date:
        patient.birth_date = history.birth_date
    db.add(db_history)
    db.commit()
    db.refresh(db_history)
    return db_history

@app.put("/patients/{patient_id}/clinical-history/{history_id}", response_model=schemas.ClinicalHistory)
def update_clinical_history(patient_id: int, history_id: int, history: schemas.ClinicalHistoryUpdate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    require_clinical_write(current_user)
    patient = clinic_patient(db, patient_id, current_user)
    db_history = db.query(models.ClinicalHistory).filter(
        models.ClinicalHistory.id == history_id,
        models.ClinicalHistory.patient_id == patient_id
    ).first()
    if not db_history:
        raise HTTPException(status_code=404, detail="Clinical history not found")
    update_data = history.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_history, key, value)
    if history.birth_date:
        patient.birth_date = history.birth_date
    db.commit()
    db.refresh(db_history)
    return db_history

@app.get("/patients/{patient_id}/clinical-readiness", response_model=schemas.ClinicalReadiness)
def get_clinical_readiness(patient_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    patient = clinic_patient(db, patient_id, current_user)
    _, missing = clinical_readiness(db, patient)
    return {"complete": not missing, "missing_fields": missing}

@app.get("/patients/{patient_id}/consents", response_model=List[schemas.PatientConsent])
def get_patient_consents(patient_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    clinic_patient(db, patient_id, current_user)
    return db.query(models.PatientConsent).filter(models.PatientConsent.patient_id == patient_id).order_by(models.PatientConsent.signed_at.desc()).all()

@app.post("/patients/{patient_id}/consents", response_model=schemas.PatientConsent)
def create_patient_consent(patient_id: int, consent: schemas.PatientConsentCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    patient = clinic_patient(db, patient_id, current_user)
    require_complete_clinical_history(db, patient)
    if len(consent.title.strip()) < 3 or len(consent.content.strip()) < 30:
        raise HTTPException(status_code=422, detail="El consentimiento debe incluir un título y un texto informativo completo.")
    if len(consent.signer_name.strip()) < 3 or not consent.signature_data.startswith("data:image/png;base64,"):
        raise HTTPException(status_code=422, detail="Completa los datos del firmante y registra su firma manuscrita.")
    if len(consent.signature_data) > 1_500_000:
        raise HTTPException(status_code=413, detail="La firma supera el tamaño permitido.")
    if consent.treatment_id:
        linked = db.query(models.Treatment).filter(models.Treatment.id == consent.treatment_id, models.Treatment.patient_id == patient_id).first()
        if not linked:
            raise HTTPException(status_code=422, detail="El tratamiento seleccionado no pertenece al paciente.")
    record = models.PatientConsent(**consent.dict(), patient_id=patient_id, created_by=current_user.display_name)
    db.add(record); db.commit(); db.refresh(record)
    return record

# Appointments CRUD
@app.get("/appointments/", response_model=List[schemas.Appointment])
def read_appointments(skip: int = Query(0, ge=0, le=100_000), limit: int = Query(100, ge=1, le=500), db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    query = db.query(models.Appointment).join(models.Patient).filter(models.Patient.clinic_id == current_user.clinic_id)
    if current_user.role in {"dentist", "specialist"}:
        query = query.filter(models.Appointment.professional_user_id == current_user.id)
    return query.order_by(models.Appointment.date).offset(skip).limit(limit).all()

@app.post("/patients/{patient_id}/appointments", response_model=schemas.Appointment)
def create_appointment(patient_id: int, appointment: schemas.AppointmentCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    patient = clinic_patient(db, patient_id, current_user)
    if appointment.duration_minutes < 15 or appointment.duration_minutes > 480 or appointment.duration_minutes % 15 != 0:
        raise HTTPException(status_code=422, detail="La duración debe configurarse en bloques de 15 minutos.")
    if appointment.date.minute % 15 != 0 or appointment.date.second != 0:
        raise HTTPException(status_code=422, detail="Las citas deben iniciar en intervalos de 15 minutos.")
    data = appointment.dict()
    room_id = data.get("room_id")
    if not room_id:
        raise HTTPException(status_code=422, detail="Selecciona el consultorio o unidad odontológica.")
    room = db.query(models.DentalRoom).filter(models.DentalRoom.id == room_id, models.DentalRoom.clinic_id == current_user.clinic_id, models.DentalRoom.active == 1).first()
    if not room:
        raise HTTPException(status_code=422, detail="Selecciona un consultorio activo de la clínica.")
    data["room_name"] = room.name
    ensure_room_available(db, room.id, appointment.date, appointment.duration_minutes)
    professional_user_id = data.get("professional_user_id")
    if professional_user_id:
        professional = db.query(models.User).filter(models.User.id == professional_user_id, models.User.clinic_id == current_user.clinic_id, models.User.role.in_(["dentist", "specialist"]), models.User.active == 1).first()
        if not professional:
            raise HTTPException(status_code=422, detail="Selecciona un profesional clínico válido.")
        data["professional"] = professional.display_name
        if patient.assigned_user_id is None:
            patient.assigned_user_id = professional.id
        ensure_appointment_available(db, professional.id, appointment.date, appointment.duration_minutes)
    db_appointment = models.Appointment(**data, patient_id=patient_id)
    db.add(db_appointment)
    db.commit()
    db.refresh(db_appointment)
    return db_appointment

@app.delete("/patients/{patient_id}")
def delete_patient(patient_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    require_admin(current_user)
    db_patient = clinic_patient(db, patient_id, current_user)
    db.delete(db_patient)
    db.commit()
    return {"ok": True}

@app.delete("/appointments/{appointment_id}")
def delete_appointment(appointment_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    query = db.query(models.Appointment).join(models.Patient).filter(models.Appointment.id == appointment_id, models.Patient.clinic_id == current_user.clinic_id)
    if current_user.role in {"dentist", "specialist"}:
        query = query.filter(models.Patient.assigned_user_id == current_user.id)
    db_appointment = query.first()
    if not db_appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    db.delete(db_appointment)
    db.commit()
    return {"ok": True}

@app.put("/patients/{patient_id}", response_model=schemas.Patient)
def update_patient(patient_id: int, patient: schemas.PatientCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_patient = clinic_patient(db, patient_id, current_user)
    first_name = (patient.first_name or patient.name or "").strip()
    first_surname = (patient.first_surname or patient.second_name or "").strip()
    name = " ".join(part for part in (first_name, patient.second_name, first_surname, patient.second_surname) if part)
    phone = (patient.phone or "").strip() or None
    email = (patient.email or "").strip().lower() or None
    if not name:
        raise HTTPException(status_code=422, detail="El nombre completo es obligatorio.")
    if phone and not phone.isdigit():
        raise HTTPException(status_code=422, detail="El teléfono solo puede contener números.")
    if email and not EMAIL_PATTERN.fullmatch(email):
        raise HTTPException(status_code=422, detail="Ingresa un correo electrónico válido.")
    from sqlalchemy import or_
    duplicate_filters = []
    if phone:
        duplicate_filters.append(models.Patient.phone == phone)
    if email:
        duplicate_filters.append(func.lower(models.Patient.email) == email)
    if duplicate_filters:
        duplicate = db.query(models.Patient).filter(
            models.Patient.clinic_id == current_user.clinic_id,
            models.Patient.id != patient_id,
            or_(*duplicate_filters),
        ).first()
        if duplicate:
            raise HTTPException(status_code=409, detail=f"El teléfono o correo ya pertenece a {duplicate.name}.")
    db_patient.name = name
    db_patient.first_name = first_name
    db_patient.first_surname = first_surname
    db_patient.second_name = patient.second_name or ""
    db_patient.phone_country_code = (patient.phone_country_code or "+57").strip()
    db_patient.phone = phone
    db_patient.email = email
    if patient.gender not in {"", "male", "female", "other", "unspecified"}:
        raise HTTPException(status_code=422, detail="Selecciona un género válido.")
    db_patient.gender = patient.gender
    for field in ("second_surname", "document_type", "document_number", "birth_date", "blood_type", "marital_status", "birth_place", "origin_country", "ethnicity", "education_level", "landline", "residence_country", "state", "city", "residential_zone", "address", "neighborhood", "occupation", "occupation_code", "insurer_type", "insurer_name", "affiliation_type", "coverage", "companion_name", "companion_phone", "companion_email", "responsible_name", "responsible_phone", "responsible_relationship"):
        setattr(db_patient, field, getattr(patient, field) or "")
    db.commit()
    db.refresh(db_patient)
    return db_patient

@app.put("/appointments/{appointment_id}", response_model=schemas.Appointment)
def update_appointment(appointment_id: int, appointment: schemas.AppointmentCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    query = db.query(models.Appointment).join(models.Patient).filter(models.Appointment.id == appointment_id, models.Patient.clinic_id == current_user.clinic_id)
    if current_user.role in {"dentist", "specialist"}:
        query = query.filter(models.Patient.assigned_user_id == current_user.id)
    db_appointment = query.first()
    if not db_appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    if appointment.duration_minutes < 15 or appointment.duration_minutes > 480 or appointment.duration_minutes % 15 != 0:
        raise HTTPException(status_code=422, detail="La duración debe configurarse en bloques de 15 minutos.")
    if appointment.date.minute % 15 != 0 or appointment.date.second != 0:
        raise HTTPException(status_code=422, detail="Las citas deben iniciar en intervalos de 15 minutos.")
    db_appointment.date = appointment.date
    db_appointment.reason = appointment.reason
    db_appointment.status = appointment.status
    db_appointment.duration_minutes = appointment.duration_minutes
    db_appointment.professional_user_id = appointment.professional_user_id
    if not appointment.room_id:
        raise HTTPException(status_code=422, detail="Selecciona el consultorio o unidad odontológica.")
    room = db.query(models.DentalRoom).filter(models.DentalRoom.id == appointment.room_id, models.DentalRoom.clinic_id == current_user.clinic_id, models.DentalRoom.active == 1).first()
    if not room:
        raise HTTPException(status_code=422, detail="Selecciona un consultorio activo de la clínica.")
    ensure_room_available(db, room.id, appointment.date, appointment.duration_minutes, db_appointment.id)
    db_appointment.room_id = room.id
    db_appointment.room_name = room.name
    if appointment.professional_user_id:
        professional = db.query(models.User).filter(models.User.id == appointment.professional_user_id, models.User.clinic_id == current_user.clinic_id, models.User.role.in_(["dentist", "specialist"]), models.User.active == 1).first()
        if not professional:
            raise HTTPException(status_code=422, detail="Selecciona un profesional clínico válido.")
        db_appointment.professional = professional.display_name
        ensure_appointment_available(db, professional.id, appointment.date, appointment.duration_minutes, db_appointment.id)
    else:
        db_appointment.professional = appointment.professional
    db.commit()
    db.refresh(db_appointment)
    return db_appointment

@app.get("/patients/{patient_id}/messages", response_model=List[schemas.Message])
def get_messages(patient_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    clinic_patient(db, patient_id, current_user)
    return db.query(models.Message).filter(models.Message.patient_id == patient_id).order_by(models.Message.timestamp.asc()).all()

@app.post("/patients/{patient_id}/messages", response_model=schemas.Message)
def send_message(patient_id: int, message: schemas.MessageCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    patient = clinic_patient(db, patient_id, current_user)
    
    db_message = models.Message(patient_id=patient_id, content=message.content, direction="out")
    db.add(db_message)
    db.commit()
    db.refresh(db_message)

    # Integración con WhatsApp Cloud API (Comentada porque requiere credenciales reales de Meta)
    # import requests
    # WHATSAPP_API_TOKEN = "TU_TOKEN_DE_META"
    # WHATSAPP_PHONE_ID = "TU_PHONE_ID"
    # url = f"https://graph.facebook.com/v17.0/{WHATSAPP_PHONE_ID}/messages"
    # headers = {"Authorization": f"Bearer {WHATSAPP_API_TOKEN}", "Content-Type": "application/json"}
    # payload = {
    #     "messaging_product": "whatsapp",
    #     "to": patient.phone,
    #     "type": "text",
    #     "text": {"body": message.content}
    # }
    # try:
    #     requests.post(url, headers=headers, json=payload)
    # except Exception as e:
    #     print("Error enviando WhatsApp:", e)

    return db_message

# Odontograma endpoints
@app.get("/patients/{patient_id}/odontograma", response_model=schemas.Odontograma)
def get_odontograma(patient_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    clinic_patient(db, patient_id, current_user)
    odontograma = db.query(models.Odontograma).filter(
        models.Odontograma.patient_id == patient_id
    ).order_by(models.Odontograma.updated_at.desc()).first()
    if not odontograma:
        raise HTTPException(status_code=404, detail="Odontograma not found")
    return odontograma

@app.post("/patients/{patient_id}/odontograma", response_model=schemas.Odontograma)
def save_odontograma(patient_id: int, odontograma: schemas.OdontogramaCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    require_clinical_write(current_user)
    clinic_patient(db, patient_id, current_user)
    # Update existing or create new
    existing = db.query(models.Odontograma).filter(
        models.Odontograma.patient_id == patient_id
    ).order_by(models.Odontograma.updated_at.desc()).first()
    if existing:
        existing.data = odontograma.data
        db.commit()
        db.refresh(existing)
        return existing
    else:
        db_odontograma = models.Odontograma(patient_id=patient_id, data=odontograma.data)
        db.add(db_odontograma)
        db.commit()
        db.refresh(db_odontograma)
        return db_odontograma

@app.get("/patients/{patient_id}/periodontograma", response_model=schemas.Periodontograma)
def get_periodontograma(patient_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    clinic_patient(db, patient_id, current_user)
    record = db.query(models.Periodontograma).filter(models.Periodontograma.patient_id == patient_id).order_by(models.Periodontograma.updated_at.desc()).first()
    if not record:
        raise HTTPException(status_code=404, detail="Periodontograma no encontrado")
    return record

@app.post("/patients/{patient_id}/periodontograma", response_model=schemas.Periodontograma)
def save_periodontograma(patient_id: int, payload: schemas.PeriodontogramaCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    require_clinical_write(current_user)
    clinic_patient(db, patient_id, current_user)
    record = db.query(models.Periodontograma).filter(models.Periodontograma.patient_id == patient_id).order_by(models.Periodontograma.updated_at.desc()).first()
    if record:
        record.data = payload.data
        record.notes = payload.notes
    else:
        record = models.Periodontograma(patient_id=patient_id, data=payload.data, notes=payload.notes)
        db.add(record)
    db.commit()
    db.refresh(record)
    return record

# Immutable clinical evolutions. Corrections are stored as new clarification records.
@app.get("/patients/{patient_id}/evolutions", response_model=List[schemas.ClinicalEvolution])
def get_evolutions(patient_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    clinic_patient(db, patient_id, current_user)
    return db.query(models.ClinicalEvolution).filter(models.ClinicalEvolution.patient_id == patient_id).order_by(models.ClinicalEvolution.created_at.desc()).all()

@app.post("/patients/{patient_id}/evolutions", response_model=schemas.ClinicalEvolution)
def create_evolution(patient_id: int, evolution: schemas.ClinicalEvolutionCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    if current_user.role not in {"dentist", "specialist"}:
        raise HTTPException(status_code=403, detail="La evolución debe registrarla el odontólogo o especialista que realizó el tratamiento.")
    patient = clinic_patient(db, patient_id, current_user)
    require_complete_clinical_history(db, patient)
    if evolution.clarification_of_id:
        original = db.query(models.ClinicalEvolution).filter(models.ClinicalEvolution.id == evolution.clarification_of_id, models.ClinicalEvolution.patient_id == patient_id).first()
        if not original:
            raise HTTPException(status_code=404, detail="Original evolution not found")
    if evolution.treatment_id:
        linked_treatment = db.query(models.Treatment).filter(models.Treatment.id == evolution.treatment_id, models.Treatment.patient_id == patient_id).first()
        if not linked_treatment:
            raise HTTPException(status_code=422, detail="El tratamiento relacionado no pertenece al paciente.")
    payload = evolution.dict()
    payload["professional"] = current_user.display_name
    record = models.ClinicalEvolution(**payload, patient_id=patient_id)
    db.add(record)
    db.commit()
    db.refresh(record)
    return record

@app.get("/treatment-catalog/", response_model=List[schemas.TreatmentCatalog])
def get_treatment_catalog(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    ensure_treatment_catalog(db, current_user.clinic_id)
    query = db.query(models.TreatmentCatalogItem).filter(models.TreatmentCatalogItem.clinic_id == current_user.clinic_id)
    if not current_user.is_clinic_owner:
        query = query.filter(models.TreatmentCatalogItem.active == 1)
    return query.order_by(models.TreatmentCatalogItem.name).all()

@app.post("/treatment-catalog/", response_model=schemas.TreatmentCatalog)
def create_treatment_catalog_item(item: schemas.TreatmentCatalogCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    require_clinic_owner(current_user)
    name = " ".join(item.name.strip().split())
    if len(name) < 3:
        raise HTTPException(status_code=422, detail="El tratamiento debe tener al menos 3 caracteres.")
    if item.default_amount < 0:
        raise HTTPException(status_code=422, detail="El valor no puede ser negativo.")
    record = models.TreatmentCatalogItem(clinic_id=current_user.clinic_id, name=name, default_amount=item.default_amount, active=int(item.active))
    db.add(record); db.commit(); db.refresh(record)
    return record

@app.put("/treatment-catalog/{item_id}", response_model=schemas.TreatmentCatalog)
def update_treatment_catalog_item(item_id: int, item: schemas.TreatmentCatalogUpdate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    require_clinic_owner(current_user)
    record = db.query(models.TreatmentCatalogItem).filter(models.TreatmentCatalogItem.id == item_id, models.TreatmentCatalogItem.clinic_id == current_user.clinic_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Tratamiento del catálogo no encontrado.")
    if item.name is not None:
        name = " ".join(item.name.strip().split())
        if len(name) < 3:
            raise HTTPException(status_code=422, detail="El tratamiento debe tener al menos 3 caracteres.")
        record.name = name
    if item.default_amount is not None:
        if item.default_amount < 0:
            raise HTTPException(status_code=422, detail="El valor no puede ser negativo.")
        record.default_amount = item.default_amount
    if item.active is not None:
        record.active = int(item.active)
    db.commit(); db.refresh(record)
    return record

@app.get("/patients/{patient_id}/treatments", response_model=List[schemas.Treatment])
def get_treatments(patient_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    clinic_patient(db, patient_id, current_user)
    return db.query(models.Treatment).filter(models.Treatment.patient_id == patient_id).order_by(models.Treatment.created_at.desc()).all()

@app.post("/patients/{patient_id}/treatments", response_model=schemas.Treatment)
def create_treatment(patient_id: int, treatment: schemas.TreatmentCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    require_clinical_write(current_user)
    patient = clinic_patient(db, patient_id, current_user)
    require_complete_clinical_history(db, patient)
    catalog_item = None
    if treatment.catalog_item_id:
        catalog_item = db.query(models.TreatmentCatalogItem).filter(models.TreatmentCatalogItem.id == treatment.catalog_item_id, models.TreatmentCatalogItem.clinic_id == current_user.clinic_id, models.TreatmentCatalogItem.active == 1).first()
        if not catalog_item:
            raise HTTPException(status_code=422, detail="El tratamiento seleccionado no pertenece al catálogo de la clínica.")
    try:
        surfaces = json.loads(treatment.odontogram_surfaces or "[]")
        if not isinstance(surfaces, list):
            raise ValueError
    except (json.JSONDecodeError, ValueError):
        raise HTTPException(status_code=422, detail="La relación con el odontograma no es válida.")
    if not catalog_item:
        raise HTTPException(status_code=422, detail="Selecciona un tratamiento activo del catálogo.")
    discount = treatment.discount_percent if current_user.role in {"admin", "administrative"} else 0
    if discount < 0 or discount > 100:
        raise HTTPException(status_code=422, detail="El descuento debe estar entre 0 y 100.")
    payload = treatment.dict()
    payload.update(name=catalog_item.name, base_amount=catalog_item.default_amount, discount_percent=discount, amount=round(catalog_item.default_amount * (1 - discount / 100), 2))
    record = models.Treatment(**payload, patient_id=patient_id)
    db.add(record)
    db.commit()
    db.refresh(record)
    return record

@app.put("/treatments/{treatment_id}", response_model=schemas.Treatment)
def update_treatment(treatment_id: int, treatment: schemas.TreatmentUpdate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    if current_user.role == "administrative":
        requested_fields = set(treatment.dict(exclude_unset=True))
        if requested_fields - {"discount_percent"}:
            raise HTTPException(status_code=403, detail="El personal administrativo solo puede ajustar el descuento.")
    else:
        require_clinical_write(current_user)
    query = db.query(models.Treatment).join(models.Patient).filter(models.Treatment.id == treatment_id, models.Patient.clinic_id == current_user.clinic_id)
    if current_user.role in {"dentist", "specialist"}:
        query = query.filter(models.Patient.assigned_user_id == current_user.id)
    record = query.first()
    if not record:
        raise HTTPException(status_code=404, detail="Treatment not found")
    if treatment.status in {"in_progress", "completed"} and treatment.status != record.status:
        signed_consent = db.query(models.PatientConsent).filter(models.PatientConsent.patient_id == record.patient_id, models.PatientConsent.treatment_id == record.id).first()
        if not signed_consent:
            raise HTTPException(status_code=409, detail="El paciente debe firmar el consentimiento informado asociado antes de iniciar el tratamiento.")
    if treatment.odontogram_surfaces is not None:
        try:
            if not isinstance(json.loads(treatment.odontogram_surfaces), list):
                raise ValueError
        except (json.JSONDecodeError, ValueError):
            raise HTTPException(status_code=422, detail="La relación con el odontograma no es válida.")
    if treatment.discount_percent is not None:
        if current_user.role not in {"admin", "administrative"}:
            raise HTTPException(status_code=403, detail="No tienes permiso para modificar descuentos.")
        if treatment.discount_percent < 0 or treatment.discount_percent > 100:
            raise HTTPException(status_code=422, detail="El descuento debe estar entre 0 y 100.")
        record.discount_percent = treatment.discount_percent
        record.amount = round(record.base_amount * (1 - treatment.discount_percent / 100), 2)
    for key, value in treatment.dict(exclude_unset=True).items():
        if key in {"amount", "base_amount", "discount_percent"}:
            continue
        setattr(record, key, value)
    db.commit()
    db.refresh(record)
    return record

@app.get("/patients/{patient_id}/prescriptions", response_model=List[schemas.Prescription])
def get_prescriptions(patient_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    clinic_patient(db, patient_id, current_user)
    return db.query(models.Prescription).filter(models.Prescription.patient_id == patient_id).order_by(models.Prescription.created_at.desc()).all()

@app.post("/patients/{patient_id}/prescriptions", response_model=schemas.Prescription)
def create_prescription(patient_id: int, prescription: schemas.PrescriptionCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    require_clinical_write(current_user)
    clinic_patient(db, patient_id, current_user)
    try:
        medications = json.loads(prescription.medications)
        if not isinstance(medications, list) or not medications:
            raise ValueError
        required = {"name", "dose", "frequency", "duration"}
        if any(not required.issubset(item) or any(not str(item[key]).strip() for key in required) for item in medications):
            raise ValueError
    except (json.JSONDecodeError, TypeError, ValueError):
        raise HTTPException(status_code=422, detail="Agrega al menos un medicamento con nombre, dosis, frecuencia y duración.")
    record = models.Prescription(**prescription.dict(), patient_id=patient_id)
    db.add(record)
    db.commit()
    db.refresh(record)
    return record

@app.post("/prescriptions/{prescription_id}/mark-sent", response_model=schemas.Prescription)
def mark_prescription_sent(prescription_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    require_clinical_write(current_user)
    record = db.query(models.Prescription).join(models.Patient).filter(models.Prescription.id == prescription_id, models.Patient.clinic_id == current_user.clinic_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Fórmula no encontrada.")
    record.status = "sent"
    record.sent_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(record)
    return record

@app.get("/payments/", response_model=List[schemas.Payment])
def get_payments(patient_id: int | None = None, business_date: date | None = None, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    require_management(current_user)
    query = db.query(models.Payment).filter(models.Payment.clinic_id == current_user.clinic_id)
    if patient_id is not None:
        clinic_patient(db, patient_id, current_user)
        query = query.filter(models.Payment.patient_id == patient_id)
    if business_date is not None:
        query = query.filter(models.Payment.business_date == business_date)
    return query.order_by(models.Payment.created_at.desc()).all()

@app.post("/payments/", response_model=schemas.Payment)
def create_payment(payment: schemas.PaymentCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    require_management(current_user)
    if payment.amount <= 0:
        raise HTTPException(status_code=422, detail="El valor del movimiento debe ser mayor que cero.")
    payload = payment.dict()
    business_date = payment.business_date or datetime.now(ZoneInfo("America/Bogota")).date()
    closed = db.query(models.CashClosing).filter(models.CashClosing.clinic_id == current_user.clinic_id, models.CashClosing.business_date == business_date).first()
    if closed:
        raise HTTPException(status_code=409, detail="La caja de este día ya fue cerrada y no admite nuevos movimientos.")
    payload["business_date"] = business_date
    if payment.patient_id:
        clinic_patient(db, payment.patient_id, current_user)
    if payment.treatment_id:
        treatment_query = db.query(models.Treatment).join(models.Patient).filter(models.Treatment.id == payment.treatment_id, models.Patient.clinic_id == current_user.clinic_id)
        if current_user.role in {"dentist", "specialist"}:
            treatment_query = treatment_query.filter(models.Patient.assigned_user_id == current_user.id)
        treatment = treatment_query.first()
        if not treatment:
            raise HTTPException(status_code=404, detail="Tratamiento no encontrado")
        if payment.patient_id and payment.patient_id != treatment.patient_id:
            raise HTTPException(status_code=422, detail="El tratamiento no pertenece al paciente seleccionado.")
        payload["patient_id"] = treatment.patient_id
        if payment.type == "income" and payment.amount > treatment.balance_amount:
            raise HTTPException(status_code=422, detail=f"El abono supera el saldo pendiente de {treatment.balance_amount:.0f}.")
    record = models.Payment(**payload, clinic_id=current_user.clinic_id)
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@app.get("/cash-closings/{business_date}", response_model=schemas.CashClosing | None)
def get_cash_closing(business_date: date, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    require_management(current_user)
    return db.query(models.CashClosing).filter(models.CashClosing.clinic_id == current_user.clinic_id, models.CashClosing.business_date == business_date).first()


@app.post("/cash-closings", response_model=schemas.CashClosing)
def close_cash_register(payload: schemas.CashClosingCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    require_management(current_user)
    today = datetime.now(ZoneInfo("America/Bogota")).date()
    if payload.business_date > today:
        raise HTTPException(status_code=422, detail="No es posible cerrar una caja de una fecha futura.")
    existing = db.query(models.CashClosing).filter(models.CashClosing.clinic_id == current_user.clinic_id, models.CashClosing.business_date == payload.business_date).first()
    if existing:
        raise HTTPException(status_code=409, detail="La caja de este día ya fue cerrada.")
    movements = db.query(models.Payment).filter(models.Payment.clinic_id == current_user.clinic_id, models.Payment.business_date == payload.business_date).all()
    income = sum((item.amount or 0) for item in movements if item.type == "income")
    expenses = sum((item.amount or 0) for item in movements if item.type == "expense")
    cash_income = sum((item.amount or 0) for item in movements if item.type == "income" and item.method == "cash")
    cash_expenses = sum((item.amount or 0) for item in movements if item.type == "expense" and item.method == "cash")
    closing = models.CashClosing(
        clinic_id=current_user.clinic_id,
        business_date=payload.business_date,
        income_total=income,
        expense_total=expenses,
        balance_total=income - expenses,
        cash_available=cash_income - cash_expenses,
        movement_count=len(movements),
        notes=payload.notes or "",
        closed_by=current_user.display_name,
    )
    db.add(closing)
    db.commit()
    db.refresh(closing)
    return closing

@app.get("/inventory/", response_model=List[schemas.InventoryItem])
def get_inventory(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    require_management(current_user)
    return db.query(models.InventoryItem).filter(models.InventoryItem.clinic_id == current_user.clinic_id).order_by(models.InventoryItem.name).all()

@app.post("/inventory/", response_model=schemas.InventoryItem)
def create_inventory_item(item: schemas.InventoryItemCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    require_management(current_user)
    record = models.InventoryItem(**item.dict(), clinic_id=current_user.clinic_id)
    db.add(record)
    db.commit()
    db.refresh(record)
    return record

@app.put("/inventory/{item_id}", response_model=schemas.InventoryItem)
def update_inventory_item(item_id: int, item: schemas.InventoryItemUpdate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    require_management(current_user)
    record = db.query(models.InventoryItem).filter(models.InventoryItem.id == item_id, models.InventoryItem.clinic_id == current_user.clinic_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    for key, value in item.dict(exclude_unset=True).items():
        setattr(record, key, value)
    db.commit()
    db.refresh(record)
    return record

@app.get("/reports/dashboard")
def dashboard_report(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    require_management(current_user)
    now = datetime.utcnow()
    clinic_id = current_user.clinic_id
    payments = db.query(models.Payment).filter(models.Payment.clinic_id == clinic_id).all()
    income = sum(p.amount for p in payments if p.type == "income")
    expenses = sum(p.amount for p in payments if p.type == "expense")
    appointment_counts = dict(db.query(models.Appointment.status, func.count(models.Appointment.id)).join(models.Patient).filter(models.Patient.clinic_id == clinic_id).group_by(models.Appointment.status).all())
    treatment_total = db.query(func.coalesce(func.sum(models.Treatment.amount), 0)).join(models.Patient).filter(models.Patient.clinic_id == clinic_id).scalar() or 0
    paid_by_patient = dict(db.query(models.Payment.patient_id, func.coalesce(func.sum(models.Payment.amount), 0)).filter(models.Payment.clinic_id == clinic_id, models.Payment.type == "income").group_by(models.Payment.patient_id).all())
    treatment_by_patient = dict(db.query(models.Treatment.patient_id, func.coalesce(func.sum(models.Treatment.amount), 0)).join(models.Patient).filter(models.Patient.clinic_id == clinic_id).group_by(models.Treatment.patient_id).all())
    receivables = sum(max(float(total) - float(paid_by_patient.get(patient_id, 0)), 0) for patient_id, total in treatment_by_patient.items())
    low_stock = db.query(models.InventoryItem).filter(models.InventoryItem.clinic_id == clinic_id, models.InventoryItem.quantity <= models.InventoryItem.min_stock).count()
    upcoming = db.query(models.Appointment).join(models.Patient).filter(models.Patient.clinic_id == clinic_id, models.Appointment.date >= now).order_by(models.Appointment.date).limit(5).all()
    return {
        "patients": db.query(models.Patient).filter(models.Patient.clinic_id == clinic_id).count(),
        "appointments": appointment_counts,
        "income": income,
        "expenses": expenses,
        "balance": income - expenses,
        "treatment_value": treatment_total,
        "receivables": receivables,
        "low_stock": low_stock,
        "upcoming_appointments": [{"id": a.id, "patient_id": a.patient_id, "date": a.date, "reason": a.reason, "status": a.status} for a in upcoming],
    }

@app.get("/integrations/status")
def integration_status(current_user: models.User = Depends(auth.get_current_user)):
    return {
        "whatsapp": bool(os.environ.get("WHATSAPP_API_TOKEN") and os.environ.get("WHATSAPP_PHONE_ID")),
        "email": bool(os.environ.get("SMTP_HOST") and os.environ.get("SMTP_USER")),
        "dian": bool(os.environ.get("DIAN_PROVIDER_URL") and os.environ.get("DIAN_API_KEY")),
        "rips": bool(os.environ.get("RIPS_PROVIDER_URL") and os.environ.get("RIPS_API_KEY")),
        "ai": bool(os.environ.get("OPENAI_API_KEY")),
        "exocad": bool(os.environ.get("EXOCAD_API_KEY") or os.environ.get("EXOCAD_INTEGRATION_ENABLED")),
    }
