from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    role: str
    class Config:
        orm_mode = True

class Token(BaseModel):
    access_token: str
    token_type: str

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

class PatientBase(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None

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
