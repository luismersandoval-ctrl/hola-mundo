from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Float, Date
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base

class Clinic(Base):
    __tablename__ = "clinics"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    owner_user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    users = relationship("User", back_populates="clinic", foreign_keys="User.clinic_id")
    patients = relationship("Patient", back_populates="clinic")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, nullable=True, index=True)
    full_name = Column(String, default="")
    title = Column(String, default="")
    gender = Column(String, default="")
    hashed_password = Column(String)
    role = Column(String, default="admin")
    clinic_id = Column(Integer, ForeignKey("clinics.id"), nullable=True, index=True)
    active = Column(Integer, default=1)
    clinic = relationship("Clinic", back_populates="users", foreign_keys=[clinic_id])
    assigned_patients = relationship("Patient", back_populates="assigned_user", foreign_keys="Patient.assigned_user_id")

    @property
    def clinic_name(self):
        return self.clinic.name if self.clinic else "OdontoSpace"

    @property
    def is_clinic_owner(self):
        return bool(self.clinic and self.clinic.owner_user_id == self.id)

    @property
    def display_name(self):
        prefix = f"{self.title}. " if self.role in {"dentist", "specialist"} and self.title else ""
        return f"{prefix}{self.full_name}".strip() or self.username

class RegistrationOTP(Base):
    __tablename__ = "registration_otps"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True, nullable=False)
    clinic_name = Column(String, nullable=False, default="OdontoSpace")
    code_hash = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    attempts = Column(Integer, default=0)
    used = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class Patient(Base):
    __tablename__ = "patients"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    first_name = Column(String, default="")
    second_name = Column(String, default="")
    first_surname = Column(String, default="")
    phone_country_code = Column(String, default="+57")
    phone = Column(String)
    email = Column(String, index=True)
    gender = Column(String, default="")
    clinic_id = Column(Integer, ForeignKey("clinics.id"), nullable=False, index=True)
    clinic = relationship("Clinic", back_populates="patients")
    assigned_user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    assigned_user = relationship("User", back_populates="assigned_patients", foreign_keys=[assigned_user_id])
    history = relationship("MedicalHistory", back_populates="patient", cascade="all, delete-orphan")
    clinical_histories = relationship("ClinicalHistory", back_populates="patient", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="patient", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="patient", cascade="all, delete-orphan")
    odontogramas = relationship("Odontograma", back_populates="patient", cascade="all, delete-orphan")
    periodontogramas = relationship("Periodontograma", back_populates="patient", cascade="all, delete-orphan")
    evolutions = relationship("ClinicalEvolution", back_populates="patient", cascade="all, delete-orphan")
    treatments = relationship("Treatment", back_populates="patient", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="patient", cascade="all, delete-orphan")

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
    status = Column(String, default="pending")
    duration_minutes = Column(Integer, default=30)
    professional = Column(String, default="")
    professional_user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
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

class Periodontograma(Base):
    __tablename__ = "periodontogramas"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    data = Column(Text)
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    patient = relationship("Patient", back_populates="periodontogramas")

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
    document_id = Column(String, default="")
    birth_date = Column(String, default="")
    address = Column(String, default="")
    occupation = Column(String, default="")
    emergency_contact = Column(String, default="")
    emergency_phone = Column(String, default="")
    blood_type = Column(String, default="")
    insurance = Column(String, default="")
    family_history = Column(Text, default="")
    dental_history = Column(Text, default="")
    oral_hygiene = Column(Text, default="")
    vital_signs = Column(Text, default="")
    diagnosis = Column(Text, default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    patient = relationship("Patient", back_populates="clinical_histories")

class ClinicalEvolution(Base):
    __tablename__ = "clinical_evolutions"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    professional = Column(String, default="")
    diagnosis = Column(Text, default="")
    procedure = Column(Text, default="")
    teeth = Column(String, default="")
    materials = Column(Text, default="")
    recommendations = Column(Text, default="")
    next_control = Column(DateTime, nullable=True)
    clarification_of_id = Column(Integer, ForeignKey("clinical_evolutions.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    patient = relationship("Patient", back_populates="evolutions")

class Treatment(Base):
    __tablename__ = "treatments"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    tooth = Column(String, default="")
    status = Column(String, default="proposed")
    amount = Column(Float, default=0)
    notes = Column(Text, default="")
    catalog_item_id = Column(Integer, ForeignKey("treatment_catalog.id"), nullable=True)
    odontogram_reference = Column(Text, default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    patient = relationship("Patient", back_populates="treatments")
    payments = relationship("Payment", back_populates="treatment")

class TreatmentCatalogItem(Base):
    __tablename__ = "treatment_catalog"
    id = Column(Integer, primary_key=True, index=True)
    clinic_id = Column(Integer, ForeignKey("clinics.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    default_amount = Column(Float, default=0)
    active = Column(Integer, default=1)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class Payment(Base):
    __tablename__ = "payments"
    id = Column(Integer, primary_key=True, index=True)
    clinic_id = Column(Integer, ForeignKey("clinics.id"), nullable=False, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=True, index=True)
    treatment_id = Column(Integer, ForeignKey("treatments.id"), nullable=True)
    type = Column(String, default="income")
    concept = Column(String, nullable=False)
    amount = Column(Float, default=0)
    method = Column(String, default="cash")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    patient = relationship("Patient", back_populates="payments")
    treatment = relationship("Treatment", back_populates="payments")

class InventoryItem(Base):
    __tablename__ = "inventory_items"
    id = Column(Integer, primary_key=True, index=True)
    clinic_id = Column(Integer, ForeignKey("clinics.id"), nullable=False, index=True)
    name = Column(String, nullable=False, index=True)
    sku = Column(String, default="", index=True)
    quantity = Column(Float, default=0)
    min_stock = Column(Float, default=0)
    max_stock = Column(Float, default=0)
    expiry_date = Column(Date, nullable=True)
    supplier = Column(String, default="")
    unit_cost = Column(Float, default=0)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
