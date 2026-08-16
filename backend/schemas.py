from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date

class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    role: str
    email: Optional[str] = None
    clinic_id: Optional[int] = None
    clinic_name: str = "OdontoSpace"
    full_name: str = ""
    title: str = ""
    gender: str = ""
    display_name: str = ""
    active: bool = True
    is_clinic_owner: bool = False
    class Config:
        orm_mode = True

class Token(BaseModel):
    access_token: str
    token_type: str

class RegistrationRequest(BaseModel):
    clinic_name: str
    email: str
    password: str

class RegistrationVerify(BaseModel):
    clinic_name: str
    email: str
    password: str
    code: str

class MessageResponse(BaseModel):
    message: str

class StaffCreate(BaseModel):
    name: str
    username: str
    email: str
    password: str
    role: str
    gender: str

class StaffUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    active: Optional[bool] = None
    gender: Optional[str] = None

class Staff(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
    role: str
    full_name: str = ""
    title: str = ""
    gender: str = ""
    display_name: str = ""
    active: bool = True
    clinic_id: Optional[int] = None
    class Config:
        orm_mode = True

class MedicalHistoryBase(BaseModel):
    notes: str

class MedicalHistoryCreate(MedicalHistoryBase):
    pass

class MedicalHistory(MedicalHistoryBase):
    id: int
    patient_id: int
    date: datetime
    class Config:
        orm_mode = True

class ClinicalHistoryBase(BaseModel):
    alergias: Optional[str] = ""
    enfermedades_sistemicas: Optional[str] = ""
    medicamentos_actuales: Optional[str] = ""
    antecedentes_quirurgicos: Optional[str] = ""
    habitos: Optional[str] = ""
    motivo_consulta: Optional[str] = ""
    examen_intraoral: Optional[str] = ""
    plan_tratamiento: Optional[str] = ""
    observaciones: Optional[str] = ""
    document_id: Optional[str] = ""
    birth_date: Optional[str] = ""
    address: Optional[str] = ""
    occupation: Optional[str] = ""
    emergency_contact: Optional[str] = ""
    emergency_phone: Optional[str] = ""
    blood_type: Optional[str] = ""
    insurance: Optional[str] = ""
    family_history: Optional[str] = ""
    dental_history: Optional[str] = ""
    oral_hygiene: Optional[str] = ""
    vital_signs: Optional[str] = ""
    diagnosis: Optional[str] = ""

class ClinicalHistoryCreate(ClinicalHistoryBase):
    pass

class ClinicalHistoryUpdate(ClinicalHistoryBase):
    pass

class ClinicalHistory(ClinicalHistoryBase):
    id: int
    patient_id: int
    created_at: datetime
    updated_at: datetime
    class Config:
        orm_mode = True

class AppointmentBase(BaseModel):
    date: datetime
    reason: str
    status: Optional[str] = "pending"
    duration_minutes: Optional[int] = 30
    professional: Optional[str] = ""
    professional_user_id: Optional[int] = None

class AppointmentCreate(AppointmentBase):
    pass

class Appointment(AppointmentBase):
    id: int
    patient_id: int
    class Config:
        orm_mode = True

class MessageBase(BaseModel):
    content: str
    direction: str

class MessageCreate(MessageBase):
    pass

class Message(MessageBase):
    id: int
    patient_id: int
    timestamp: datetime
    class Config:
        orm_mode = True

class OdontogramaBase(BaseModel):
    data: str

class OdontogramaCreate(OdontogramaBase):
    pass

class Odontograma(OdontogramaBase):
    id: int
    patient_id: int
    created_at: datetime
    updated_at: datetime
    class Config:
        orm_mode = True

class PeriodontogramaBase(BaseModel):
    data: str
    notes: Optional[str] = ""

class PeriodontogramaCreate(PeriodontogramaBase):
    pass

class Periodontograma(PeriodontogramaBase):
    id: int
    patient_id: int
    created_at: datetime
    updated_at: datetime
    class Config:
        orm_mode = True

class PatientBase(BaseModel):
    name: Optional[str] = ""
    first_name: Optional[str] = ""
    second_name: Optional[str] = ""
    first_surname: Optional[str] = ""
    phone: Optional[str] = None
    phone_country_code: Optional[str] = "+57"
    email: Optional[str] = None
    assigned_user_id: Optional[int] = None
    gender: Optional[str] = ""

class PatientCreate(PatientBase):
    pass

class Patient(PatientBase):
    id: int
    history: List[MedicalHistory] = []
    appointments: List[Appointment] = []
    messages: List[Message] = []
    class Config:
        orm_mode = True

Patient.update_forward_refs()

class ClinicalEvolutionBase(BaseModel):
    professional: Optional[str] = ""
    diagnosis: Optional[str] = ""
    procedure: Optional[str] = ""
    teeth: Optional[str] = ""
    materials: Optional[str] = ""
    recommendations: Optional[str] = ""
    next_control: Optional[datetime] = None
    clarification_of_id: Optional[int] = None

class ClinicalEvolutionCreate(ClinicalEvolutionBase):
    pass

class ClinicalEvolution(ClinicalEvolutionBase):
    id: int
    patient_id: int
    created_at: datetime
    class Config:
        orm_mode = True

class TreatmentBase(BaseModel):
    name: str
    tooth: Optional[str] = ""
    status: Optional[str] = "proposed"
    amount: Optional[float] = 0
    notes: Optional[str] = ""
    catalog_item_id: Optional[int] = None
    odontogram_reference: Optional[str] = ""

class TreatmentCreate(TreatmentBase):
    pass

class TreatmentUpdate(BaseModel):
    name: Optional[str] = None
    tooth: Optional[str] = None
    status: Optional[str] = None
    amount: Optional[float] = None
    notes: Optional[str] = None
    catalog_item_id: Optional[int] = None
    odontogram_reference: Optional[str] = None

class Treatment(TreatmentBase):
    id: int
    patient_id: int
    created_at: datetime
    updated_at: datetime
    class Config:
        orm_mode = True

class TreatmentCatalogBase(BaseModel):
    name: str
    default_amount: float = 0
    active: bool = True

class TreatmentCatalogCreate(TreatmentCatalogBase):
    pass

class TreatmentCatalogUpdate(BaseModel):
    name: Optional[str] = None
    default_amount: Optional[float] = None
    active: Optional[bool] = None

class TreatmentCatalog(TreatmentCatalogBase):
    id: int
    clinic_id: int
    created_at: datetime
    updated_at: datetime
    class Config:
        orm_mode = True

class PaymentBase(BaseModel):
    patient_id: Optional[int] = None
    treatment_id: Optional[int] = None
    type: Optional[str] = "income"
    concept: str
    amount: float
    method: Optional[str] = "cash"

class PaymentCreate(PaymentBase):
    pass

class Payment(PaymentBase):
    id: int
    created_at: datetime
    class Config:
        orm_mode = True

class InventoryItemBase(BaseModel):
    name: str
    sku: Optional[str] = ""
    quantity: Optional[float] = 0
    min_stock: Optional[float] = 0
    max_stock: Optional[float] = 0
    expiry_date: Optional[date] = None
    supplier: Optional[str] = ""
    unit_cost: Optional[float] = 0

class InventoryItemCreate(InventoryItemBase):
    pass

class InventoryItemUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    quantity: Optional[float] = None
    min_stock: Optional[float] = None
    max_stock: Optional[float] = None
    expiry_date: Optional[date] = None
    supplier: Optional[str] = None
    unit_cost: Optional[float] = None

class InventoryItem(InventoryItemBase):
    id: int
    updated_at: datetime
    class Config:
        orm_mode = True
