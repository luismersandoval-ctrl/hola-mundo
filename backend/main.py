from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from datetime import date, timedelta, datetime
from typing import List
import os
import hashlib
import hmac
import re
import secrets
import smtplib
from email.message import EmailMessage
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

import models, schemas, database, auth

models.Base.metadata.create_all(bind=database.engine)

def migrate_existing_database():
    """Small SQLite compatibility migration for installations created before agenda metadata."""
    with database.engine.begin() as connection:
        columns = {row[1] for row in connection.execute(text("PRAGMA table_info(appointments)"))}
        additions = {
            "status": "VARCHAR DEFAULT 'pending'",
            "duration_minutes": "INTEGER DEFAULT 30",
            "professional": "VARCHAR DEFAULT ''",
            "professional_user_id": "INTEGER",
        }
        for column, definition in additions.items():
            if column not in columns:
                connection.execute(text(f"ALTER TABLE appointments ADD COLUMN {column} {definition}"))
        user_columns = {row[1] for row in connection.execute(text("PRAGMA table_info(users)"))}
        if "email" not in user_columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN email VARCHAR"))
        if "clinic_id" not in user_columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN clinic_id INTEGER"))
        if "full_name" not in user_columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN full_name VARCHAR DEFAULT ''"))
        if "title" not in user_columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN title VARCHAR DEFAULT ''"))
        if "gender" not in user_columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN gender VARCHAR DEFAULT ''"))
        if "active" not in user_columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN active INTEGER DEFAULT 1"))
        connection.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users (email)"))
        clinic_columns = {row[1] for row in connection.execute(text("PRAGMA table_info(clinics)"))}
        if "owner_user_id" not in clinic_columns:
            connection.execute(text("ALTER TABLE clinics ADD COLUMN owner_user_id INTEGER"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_clinics_owner_user_id ON clinics (owner_user_id)"))
        otp_columns = {row[1] for row in connection.execute(text("PRAGMA table_info(registration_otps)"))}
        if "clinic_name" not in otp_columns:
            connection.execute(text("ALTER TABLE registration_otps ADD COLUMN clinic_name VARCHAR DEFAULT 'OdontoSpace' NOT NULL"))
        for table in ("patients", "payments", "inventory_items"):
            table_columns = {row[1] for row in connection.execute(text(f"PRAGMA table_info({table})"))}
            if "clinic_id" not in table_columns:
                connection.execute(text(f"ALTER TABLE {table} ADD COLUMN clinic_id INTEGER"))
            connection.execute(text(f"CREATE INDEX IF NOT EXISTS ix_{table}_clinic_id ON {table} (clinic_id)"))
        patient_columns = {row[1] for row in connection.execute(text("PRAGMA table_info(patients)"))}
        if "first_name" not in patient_columns:
            connection.execute(text("ALTER TABLE patients ADD COLUMN first_name VARCHAR DEFAULT ''"))
        if "second_name" not in patient_columns:
            connection.execute(text("ALTER TABLE patients ADD COLUMN second_name VARCHAR DEFAULT ''"))
        if "first_surname" not in patient_columns:
            connection.execute(text("ALTER TABLE patients ADD COLUMN first_surname VARCHAR DEFAULT ''"))
            connection.execute(text("UPDATE patients SET first_surname = second_name WHERE second_name IS NOT NULL AND second_name != ''"))
        if "phone_country_code" not in patient_columns:
            connection.execute(text("ALTER TABLE patients ADD COLUMN phone_country_code VARCHAR DEFAULT '+57'"))
        connection.execute(text("UPDATE patients SET first_name = name WHERE (first_name IS NULL OR first_name = '') AND name IS NOT NULL"))
        if "assigned_user_id" not in patient_columns:
            connection.execute(text("ALTER TABLE patients ADD COLUMN assigned_user_id INTEGER"))
        if "gender" not in patient_columns:
            connection.execute(text("ALTER TABLE patients ADD COLUMN gender VARCHAR DEFAULT ''"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_patients_assigned_user_id ON patients (assigned_user_id)"))
        history_columns = {row[1] for row in connection.execute(text("PRAGMA table_info(clinical_histories)"))}
        history_additions = {
            "document_id": "VARCHAR DEFAULT ''", "birth_date": "VARCHAR DEFAULT ''", "address": "VARCHAR DEFAULT ''",
            "occupation": "VARCHAR DEFAULT ''", "emergency_contact": "VARCHAR DEFAULT ''", "emergency_phone": "VARCHAR DEFAULT ''",
            "blood_type": "VARCHAR DEFAULT ''", "insurance": "VARCHAR DEFAULT ''", "family_history": "TEXT DEFAULT ''",
            "dental_history": "TEXT DEFAULT ''", "oral_hygiene": "TEXT DEFAULT ''", "vital_signs": "TEXT DEFAULT ''", "diagnosis": "TEXT DEFAULT ''",
        }
        for column, definition in history_additions.items():
            if column not in history_columns:
                connection.execute(text(f"ALTER TABLE clinical_histories ADD COLUMN {column} {definition}"))
        treatment_columns = {row[1] for row in connection.execute(text("PRAGMA table_info(treatments)"))}
        if "catalog_item_id" not in treatment_columns:
            connection.execute(text("ALTER TABLE treatments ADD COLUMN catalog_item_id INTEGER"))
        if "odontogram_reference" not in treatment_columns:
            connection.execute(text("ALTER TABLE treatments ADD COLUMN odontogram_reference TEXT DEFAULT ''"))

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
    user = auth.get_user_by_username(db, username=form_data.username)
    if not user or not user.active or not auth.verify_password(form_data.password, user.hashed_password):
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
    return db.query(models.User).filter(models.User.clinic_id == current_user.clinic_id, models.User.role.in_(["dentist", "specialist"]), models.User.active == 1).order_by(models.User.full_name).all()

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

# Patients CRUD
@app.get("/patients/", response_model=List[schemas.Patient])
def read_patients(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    query = db.query(models.Patient).filter(models.Patient.clinic_id == current_user.clinic_id)
    if current_user.role in {"dentist", "specialist"}:
        query = query.filter(models.Patient.assigned_user_id == current_user.id)
    return query.offset(skip).limit(limit).all()

@app.post("/patients/", response_model=schemas.Patient)
def create_patient(patient: schemas.PatientCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    data = patient.dict()
    first_name = (data.get("first_name") or data.get("name") or "").strip()
    first_surname = (data.get("first_surname") or data.get("second_name") or "").strip()
    if not first_name:
        raise HTTPException(status_code=422, detail="El primer nombre es obligatorio.")
    data["first_name"] = first_name
    data["first_surname"] = first_surname
    data["second_name"] = ""
    data["phone_country_code"] = (data.get("phone_country_code") or "+57").strip()
    data["name"] = " ".join(part for part in (first_name, first_surname) if part)
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
    clinic_patient(db, patient_id, current_user)
    db_history = models.ClinicalHistory(**history.dict(), patient_id=patient_id)
    db.add(db_history)
    db.commit()
    db.refresh(db_history)
    return db_history

@app.put("/patients/{patient_id}/clinical-history/{history_id}", response_model=schemas.ClinicalHistory)
def update_clinical_history(patient_id: int, history_id: int, history: schemas.ClinicalHistoryUpdate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    require_clinical_write(current_user)
    clinic_patient(db, patient_id, current_user)
    db_history = db.query(models.ClinicalHistory).filter(
        models.ClinicalHistory.id == history_id,
        models.ClinicalHistory.patient_id == patient_id
    ).first()
    if not db_history:
        raise HTTPException(status_code=404, detail="Clinical history not found")
    update_data = history.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_history, key, value)
    db.commit()
    db.refresh(db_history)
    return db_history

# Appointments CRUD
@app.get("/appointments/", response_model=List[schemas.Appointment])
def read_appointments(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    query = db.query(models.Appointment).join(models.Patient).filter(models.Patient.clinic_id == current_user.clinic_id)
    if current_user.role in {"dentist", "specialist"}:
        query = query.filter(models.Patient.assigned_user_id == current_user.id)
    return query.offset(skip).limit(limit).all()

@app.post("/patients/{patient_id}/appointments", response_model=schemas.Appointment)
def create_appointment(patient_id: int, appointment: schemas.AppointmentCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    patient = clinic_patient(db, patient_id, current_user)
    if appointment.duration_minutes < 30 or appointment.duration_minutes > 480 or appointment.duration_minutes % 30 != 0:
        raise HTTPException(status_code=422, detail="La duración debe configurarse en bloques de 30 minutos.")
    if appointment.date.minute not in {0, 30} or appointment.date.second != 0:
        raise HTTPException(status_code=422, detail="Las citas solo pueden iniciar en horas exactas o a los 30 minutos.")
    data = appointment.dict()
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
    name = " ".join(part for part in (first_name, first_surname) if part)
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
    db_patient.second_name = ""
    db_patient.phone_country_code = (patient.phone_country_code or "+57").strip()
    db_patient.phone = phone
    db_patient.email = email
    if patient.gender not in {"", "male", "female", "other", "unspecified"}:
        raise HTTPException(status_code=422, detail="Selecciona un género válido.")
    db_patient.gender = patient.gender
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
    if appointment.duration_minutes < 30 or appointment.duration_minutes > 480 or appointment.duration_minutes % 30 != 0:
        raise HTTPException(status_code=422, detail="La duración debe configurarse en bloques de 30 minutos.")
    if appointment.date.minute not in {0, 30} or appointment.date.second != 0:
        raise HTTPException(status_code=422, detail="Las citas solo pueden iniciar en horas exactas o a los 30 minutos.")
    db_appointment.date = appointment.date
    db_appointment.reason = appointment.reason
    db_appointment.status = appointment.status
    db_appointment.duration_minutes = appointment.duration_minutes
    db_appointment.professional_user_id = appointment.professional_user_id
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
    require_clinical_write(current_user)
    clinic_patient(db, patient_id, current_user)
    if evolution.clarification_of_id:
        original = db.query(models.ClinicalEvolution).filter(models.ClinicalEvolution.id == evolution.clarification_of_id, models.ClinicalEvolution.patient_id == patient_id).first()
        if not original:
            raise HTTPException(status_code=404, detail="Original evolution not found")
    record = models.ClinicalEvolution(**evolution.dict(), patient_id=patient_id)
    db.add(record)
    db.commit()
    db.refresh(record)
    return record

@app.get("/treatment-catalog/", response_model=List[schemas.TreatmentCatalog])
def get_treatment_catalog(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    ensure_treatment_catalog(db, current_user.clinic_id)
    return db.query(models.TreatmentCatalogItem).filter(models.TreatmentCatalogItem.clinic_id == current_user.clinic_id).order_by(models.TreatmentCatalogItem.name).all()

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
    clinic_patient(db, patient_id, current_user)
    if treatment.catalog_item_id:
        catalog_item = db.query(models.TreatmentCatalogItem).filter(models.TreatmentCatalogItem.id == treatment.catalog_item_id, models.TreatmentCatalogItem.clinic_id == current_user.clinic_id, models.TreatmentCatalogItem.active == 1).first()
        if not catalog_item:
            raise HTTPException(status_code=422, detail="El tratamiento seleccionado no pertenece al catálogo de la clínica.")
    record = models.Treatment(**treatment.dict(), patient_id=patient_id)
    db.add(record)
    db.commit()
    db.refresh(record)
    return record

@app.put("/treatments/{treatment_id}", response_model=schemas.Treatment)
def update_treatment(treatment_id: int, treatment: schemas.TreatmentUpdate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    require_clinical_write(current_user)
    query = db.query(models.Treatment).join(models.Patient).filter(models.Treatment.id == treatment_id, models.Patient.clinic_id == current_user.clinic_id)
    if current_user.role in {"dentist", "specialist"}:
        query = query.filter(models.Patient.assigned_user_id == current_user.id)
    record = query.first()
    if not record:
        raise HTTPException(status_code=404, detail="Treatment not found")
    for key, value in treatment.dict(exclude_unset=True).items():
        setattr(record, key, value)
    db.commit()
    db.refresh(record)
    return record

@app.get("/payments/", response_model=List[schemas.Payment])
def get_payments(patient_id: int | None = None, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    query = db.query(models.Payment).filter(models.Payment.clinic_id == current_user.clinic_id)
    if current_user.role in {"dentist", "specialist"}:
        query = query.join(models.Patient).filter(models.Patient.assigned_user_id == current_user.id)
    if patient_id is not None:
        clinic_patient(db, patient_id, current_user)
        query = query.filter(models.Payment.patient_id == patient_id)
    return query.order_by(models.Payment.created_at.desc()).all()

@app.post("/payments/", response_model=schemas.Payment)
def create_payment(payment: schemas.PaymentCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    if payment.patient_id:
        clinic_patient(db, payment.patient_id, current_user)
    if payment.treatment_id:
        treatment_query = db.query(models.Treatment).join(models.Patient).filter(models.Treatment.id == payment.treatment_id, models.Patient.clinic_id == current_user.clinic_id)
        if current_user.role in {"dentist", "specialist"}:
            treatment_query = treatment_query.filter(models.Patient.assigned_user_id == current_user.id)
        treatment = treatment_query.first()
        if not treatment:
            raise HTTPException(status_code=404, detail="Tratamiento no encontrado")
    record = models.Payment(**payment.dict(), clinic_id=current_user.clinic_id)
    db.add(record)
    db.commit()
    db.refresh(record)
    return record

@app.get("/inventory/", response_model=List[schemas.InventoryItem])
def get_inventory(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.InventoryItem).filter(models.InventoryItem.clinic_id == current_user.clinic_id).order_by(models.InventoryItem.name).all()

@app.post("/inventory/", response_model=schemas.InventoryItem)
def create_inventory_item(item: schemas.InventoryItemCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    record = models.InventoryItem(**item.dict(), clinic_id=current_user.clinic_id)
    db.add(record)
    db.commit()
    db.refresh(record)
    return record

@app.put("/inventory/{item_id}", response_model=schemas.InventoryItem)
def update_inventory_item(item_id: int, item: schemas.InventoryItemUpdate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
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
    require_admin(current_user)
    return {
        "whatsapp": bool(os.environ.get("WHATSAPP_API_TOKEN") and os.environ.get("WHATSAPP_PHONE_ID")),
        "email": bool(os.environ.get("SMTP_HOST") and os.environ.get("SMTP_USER")),
        "dian": bool(os.environ.get("DIAN_PROVIDER_URL") and os.environ.get("DIAN_API_KEY")),
        "rips": bool(os.environ.get("RIPS_PROVIDER_URL") and os.environ.get("RIPS_API_KEY")),
        "ai": bool(os.environ.get("OPENAI_API_KEY")),
    }
