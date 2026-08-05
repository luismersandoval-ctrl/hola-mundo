from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="admin")

class Patient(Base):
    __tablename__ = "patients"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    phone = Column(String)
    email = Column(String, index=True)
    history = relationship("MedicalHistory", back_populates="patient", cascade="all, delete-orphan")
    clinical_histories = relationship("ClinicalHistory", back_populates="patient", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="patient", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="patient", cascade="all, delete-orphan")
    odontogramas = relationship("Odontograma", back_populates="patient", cascade="all, delete-orphan")

class MedicalHistory(Base):
    __tablename__ = "medical_histories"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    notes = Column(Text)
    date = Column(DateTime, default=datetime.utcnow)
    patient = relationship("Patient", back_populates="history")

class Appointment(Base):
    __tablename__ = "appointments"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    date = Column(DateTime)
    reason = Column(String)
    patient = relationship("Patient", back_populates="appointments")

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    direction = Column(String) # 'in' or 'out'
    content = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)
    patient = relationship("Patient", back_populates="messages")

class Odontograma(Base):
    __tablename__ = "odontogramas"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    data = Column(Text)  # JSON string of tooth states
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    patient = relationship("Patient", back_populates="odontogramas")

class ClinicalHistory(Base):
    __tablename__ = "clinical_histories"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    alergias = Column(Text, default="")
    enfermedades_sistemicas = Column(Text, default="")
    medicamentos_actuales = Column(Text, default="")
    antecedentes_quirurgicos = Column(Text, default="")
    habitos = Column(Text, default="")
    motivo_consulta = Column(Text, default="")
    examen_intraoral = Column(Text, default="")
    plan_tratamiento = Column(Text, default="")
    observaciones = Column(Text, default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    patient = relationship("Patient", back_populates="clinical_histories")
