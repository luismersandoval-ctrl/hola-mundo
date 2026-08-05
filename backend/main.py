from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import List
import os

import models, schemas, database, auth

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Clínica Odontológica API")

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
        new_admin = models.User(username="admin", hashed_password=hashed_pw, role="admin")
        db.add(new_admin)
        db.commit()
    db.close()

seed_admin()

@app.post("/token", response_model=schemas.Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = auth.get_user_by_username(db, username=form_data.username)
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
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

# Patients CRUD
@app.get("/patients/", response_model=List[schemas.Patient])
def read_patients(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.Patient).offset(skip).limit(limit).all()

@app.post("/patients/", response_model=schemas.Patient)
def create_patient(patient: schemas.PatientCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_patient = models.Patient(**patient.dict())
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    return db_patient

@app.get("/patients/{patient_id}", response_model=schemas.Patient)
def read_patient(patient_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if db_patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    return db_patient

# Medical History CRUD
@app.post("/patients/{patient_id}/history", response_model=schemas.MedicalHistory)
def create_medical_history(patient_id: int, history: schemas.MedicalHistoryCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_history = models.MedicalHistory(**history.dict(), patient_id=patient_id)
    db.add(db_history)
    db.commit()
    db.refresh(db_history)
    return db_history

# Clinical History CRUD
@app.get("/patients/{patient_id}/clinical-history", response_model=List[schemas.ClinicalHistory])
def get_clinical_history(patient_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return db.query(models.ClinicalHistory).filter(models.ClinicalHistory.patient_id == patient_id).order_by(models.ClinicalHistory.created_at.desc()).all()

@app.post("/patients/{patient_id}/clinical-history", response_model=schemas.ClinicalHistory)
def create_clinical_history(patient_id: int, history: schemas.ClinicalHistoryCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    db_history = models.ClinicalHistory(**history.dict(), patient_id=patient_id)
    db.add(db_history)
    db.commit()
    db.refresh(db_history)
    return db_history

@app.put("/patients/{patient_id}/clinical-history/{history_id}", response_model=schemas.ClinicalHistory)
def update_clinical_history(patient_id: int, history_id: int, history: schemas.ClinicalHistoryUpdate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
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
    return db.query(models.Appointment).offset(skip).limit(limit).all()

@app.post("/patients/{patient_id}/appointments", response_model=schemas.Appointment)
def create_appointment(patient_id: int, appointment: schemas.AppointmentCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_appointment = models.Appointment(**appointment.dict(), patient_id=patient_id)
    db.add(db_appointment)
    db.commit()
    db.refresh(db_appointment)
    return db_appointment

@app.delete("/patients/{patient_id}")
def delete_patient(patient_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not db_patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    db.delete(db_patient)
    db.commit()
    return {"ok": True}

@app.delete("/appointments/{appointment_id}")
def delete_appointment(appointment_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_appointment = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not db_appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    db.delete(db_appointment)
    db.commit()
    return {"ok": True}

@app.put("/patients/{patient_id}", response_model=schemas.Patient)
def update_patient(patient_id: int, patient: schemas.PatientCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not db_patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    db_patient.name = patient.name
    db_patient.phone = patient.phone
    db_patient.email = patient.email
    db.commit()
    db.refresh(db_patient)
    return db_patient

@app.put("/appointments/{appointment_id}", response_model=schemas.Appointment)
def update_appointment(appointment_id: int, appointment: schemas.AppointmentCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_appointment = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not db_appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    db_appointment.date = appointment.date
    db_appointment.reason = appointment.reason
    db.commit()
    db.refresh(db_appointment)
    return db_appointment

@app.get("/patients/{patient_id}/messages", response_model=List[schemas.Message])
def get_messages(patient_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.Message).filter(models.Message.patient_id == patient_id).order_by(models.Message.timestamp.asc()).all()

@app.post("/patients/{patient_id}/messages", response_model=schemas.Message)
def send_message(patient_id: int, message: schemas.MessageCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
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
    db_patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not db_patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    odontograma = db.query(models.Odontograma).filter(
        models.Odontograma.patient_id == patient_id
    ).order_by(models.Odontograma.updated_at.desc()).first()
    if not odontograma:
        raise HTTPException(status_code=404, detail="Odontograma not found")
    return odontograma

@app.post("/patients/{patient_id}/odontograma", response_model=schemas.Odontograma)
def save_odontograma(patient_id: int, odontograma: schemas.OdontogramaCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not db_patient:
        raise HTTPException(status_code=404, detail="Patient not found")
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
