from pydantic import Field, conint, constr, root_validator, validator
from typing import List, Optional
from datetime import datetime, date
from security.models import SecureInputModel as BaseModel
from security.types import (
    AppointmentStatus, ClinicalText, DateText, DocumentText, EmailText, Gender, JsonText,
    MoneyAmount, NameText, OptionalEmailText, OptionalNameText, PasswordText, PaymentType,
    Percentage, PhoneText, PositiveId, PositiveMoneyAmount, QuantityAmount, RequiredShortText,
    ShortText, SignatureText, StaffRole, TreatmentStatus, UsernameText,
)
from security.validation import (
    validate_birth_date, validate_medications_json, validate_odontogram_json,
    validate_periodontogram_json, validate_signature, validate_surfaces_json, ALL_TEETH,
)

class UserBase(BaseModel):
    username: UsernameText

class UserCreate(UserBase):
    password: PasswordText

class User(UserBase):
    # Existing clinics may use an email address as their login identifier.
    username: constr(strip_whitespace=True, min_length=1, max_length=254)
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

class LoginCredentials(BaseModel):
    username: constr(strip_whitespace=True, min_length=1, max_length=254)
    password: constr(min_length=1, max_length=128)

class RegistrationRequest(BaseModel):
    clinic_name: NameText
    email: EmailText
    password: PasswordText

class RegistrationVerify(BaseModel):
    clinic_name: NameText
    email: EmailText
    password: PasswordText
    code: constr(strip_whitespace=True, regex=r"^\d{6}$")

class MessageResponse(BaseModel):
    message: str

class StaffCreate(BaseModel):
    name: NameText
    username: UsernameText
    email: EmailText
    password: PasswordText
    role: StaffRole
    gender: Gender

class StaffUpdate(BaseModel):
    name: Optional[NameText] = None
    role: Optional[StaffRole] = None
    active: Optional[bool] = None
    gender: Optional[Gender] = None

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
    notes: ClinicalText

class MedicalHistoryCreate(MedicalHistoryBase):
    pass

class MedicalHistory(MedicalHistoryBase):
    id: int
    patient_id: int
    date: datetime
    class Config:
        orm_mode = True

class PatientDiagnosticImage(BaseModel):
    id: int
    patient_id: int
    study_type: str
    study_date: str = ""
    title: str = ""
    notes: str = ""
    original_filename: str
    content_type: str
    size_bytes: int = 0
    uploaded_by: str = ""
    created_at: datetime
    class Config:
        orm_mode = True

class DiagnosticImageMetadata(BaseModel):
    study_type: constr(regex=r"^(panoramic|periapical|occlusal|coronal|cephalometric|tomography|bitewing|other)$")
    study_date: DateText = ""
    title: ShortText = ""
    notes: ClinicalText = ""

class ClinicalHistoryBase(BaseModel):
    alergias: Optional[ClinicalText] = ""
    enfermedades_sistemicas: Optional[ClinicalText] = ""
    medicamentos_actuales: Optional[ClinicalText] = ""
    antecedentes_quirurgicos: Optional[ClinicalText] = ""
    habitos: Optional[ClinicalText] = ""
    motivo_consulta: Optional[ClinicalText] = ""
    examen_intraoral: Optional[ClinicalText] = ""
    plan_tratamiento: Optional[ClinicalText] = ""
    observaciones: Optional[ClinicalText] = ""
    document_id: Optional[DocumentText] = ""
    birth_date: Optional[DateText] = ""
    address: Optional[ShortText] = ""
    occupation: Optional[ShortText] = ""
    emergency_contact: Optional[OptionalNameText] = ""
    emergency_relationship: Optional[ShortText] = ""
    emergency_phone: Optional[PhoneText] = ""
    blood_type: Optional[ShortText] = ""
    insurance: Optional[ShortText] = ""
    family_history: Optional[ClinicalText] = ""
    dental_history: Optional[ClinicalText] = ""
    oral_hygiene: Optional[ClinicalText] = ""
    vital_signs: Optional[ClinicalText] = ""
    diagnosis: Optional[ClinicalText] = ""
    current_illness: Optional[ClinicalText] = ""
    personal_history: Optional[ClinicalText] = ""
    pathological_history: Optional[ClinicalText] = ""
    pharmacological_history: Optional[ClinicalText] = ""
    systems_review: Optional[ClinicalText] = ""
    physical_exam: Optional[ClinicalText] = ""
    risk_factors: Optional[ClinicalText] = ""
    cups_code: Optional[constr(strip_whitespace=True, max_length=16, regex=r"^[A-Za-z0-9.-]*$")] = ""
    cups_name: Optional[ClinicalText] = ""
    consultation_purpose: Optional[ShortText] = ""
    external_cause: Optional[ShortText] = ""
    diagnosis_type: Optional[ShortText] = ""
    related_diagnoses: Optional[ClinicalText] = ""
    diagnostic_impression: Optional[ClinicalText] = ""

    _valid_birth_date = validator("birth_date", allow_reuse=True)(validate_birth_date)

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
    reason: RequiredShortText
    status: Optional[AppointmentStatus] = AppointmentStatus.pending
    duration_minutes: Optional[conint(ge=15, le=480)] = 15
    professional: Optional[OptionalNameText] = ""
    professional_user_id: Optional[PositiveId] = None
    room_id: Optional[PositiveId] = None
    room_name: Optional[OptionalNameText] = ""

    @validator("duration_minutes")
    def duration_uses_quarter_hour_blocks(cls, value):
        if value is not None and value % 15:
            raise ValueError("La duración debe expresarse en bloques de 15 minutos.")
        return value

class AppointmentCreate(AppointmentBase):
    pass

class Appointment(AppointmentBase):
    id: int
    patient_id: int
    class Config:
        orm_mode = True

class DentalRoomCreate(BaseModel):
    name: NameText

class DentalRoomCountUpdate(BaseModel):
    count: conint(ge=1, le=20)

class DentalRoom(BaseModel):
    id: int
    clinic_id: int
    name: str
    active: bool = True
    class Config:
        orm_mode = True

class MessageBase(BaseModel):
    content: ClinicalText
    direction: constr(regex=r"^(in|out)$")

class MessageCreate(MessageBase):
    pass

class Message(MessageBase):
    id: int
    patient_id: int
    timestamp: datetime
    class Config:
        orm_mode = True

class OdontogramaBase(BaseModel):
    data: JsonText

    _valid_data = validator("data", allow_reuse=True)(validate_odontogram_json)

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
    data: JsonText
    notes: Optional[ClinicalText] = ""

    _valid_data = validator("data", allow_reuse=True)(validate_periodontogram_json)

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
    name: Optional[OptionalNameText] = ""
    first_name: Optional[OptionalNameText] = ""
    second_name: Optional[OptionalNameText] = ""
    first_surname: Optional[OptionalNameText] = ""
    second_surname: Optional[OptionalNameText] = ""
    phone: Optional[PhoneText] = None
    phone_country_code: Optional[PhoneText] = "+57"
    email: Optional[OptionalEmailText] = None
    assigned_user_id: Optional[PositiveId] = None
    gender: Optional[constr(regex=r"^(|male|female|other|unspecified)$")] = ""
    document_type: Optional[ShortText] = ""
    document_number: Optional[DocumentText] = ""
    birth_date: Optional[DateText] = ""
    blood_type: Optional[ShortText] = ""
    marital_status: Optional[ShortText] = ""
    birth_place: Optional[ShortText] = ""
    origin_country: Optional[ShortText] = ""
    ethnicity: Optional[ShortText] = ""
    education_level: Optional[ShortText] = ""
    landline: Optional[PhoneText] = ""
    residence_country: Optional[ShortText] = ""
    state: Optional[ShortText] = ""
    city: Optional[ShortText] = ""
    residential_zone: Optional[ShortText] = ""
    address: Optional[ShortText] = ""
    neighborhood: Optional[ShortText] = ""
    occupation: Optional[ShortText] = ""
    occupation_code: Optional[ShortText] = ""
    insurer_type: Optional[ShortText] = ""
    insurer_name: Optional[ShortText] = ""
    affiliation_type: Optional[ShortText] = ""
    coverage: Optional[ShortText] = ""
    companion_name: Optional[OptionalNameText] = ""
    companion_phone: Optional[PhoneText] = ""
    companion_email: Optional[OptionalEmailText] = ""
    responsible_name: Optional[OptionalNameText] = ""
    responsible_phone: Optional[PhoneText] = ""
    responsible_relationship: Optional[ShortText] = ""

    _valid_birth_date = validator("birth_date", allow_reuse=True)(validate_birth_date)

class PatientCreate(PatientBase):
    @root_validator
    def require_patient_name(cls, values):
        if not (values.get("first_name") or values.get("name")):
            raise ValueError("El primer nombre del paciente es obligatorio.")
        return values

class Patient(PatientBase):
    id: int
    history: List[MedicalHistory] = []
    appointments: List[Appointment] = []
    messages: List[Message] = []
    class Config:
        orm_mode = True

Patient.update_forward_refs()

class ClinicalEvolutionBase(BaseModel):
    professional: Optional[OptionalNameText] = ""
    diagnosis: Optional[ClinicalText] = ""
    procedure: Optional[ClinicalText] = ""
    teeth: Optional[ShortText] = ""
    materials: Optional[ClinicalText] = ""
    technique: Optional[ClinicalText] = ""
    instruments: Optional[ClinicalText] = ""
    anesthesia: Optional[ClinicalText] = ""
    complications: Optional[ClinicalText] = ""
    observations: Optional[ClinicalText] = ""
    recommendations: Optional[ClinicalText] = ""
    next_control: Optional[datetime] = None
    clarification_of_id: Optional[PositiveId] = None
    treatment_id: Optional[PositiveId] = None

class ClinicalEvolutionCreate(ClinicalEvolutionBase):
    pass

class ClinicalEvolution(ClinicalEvolutionBase):
    id: int
    patient_id: int
    created_at: datetime
    class Config:
        orm_mode = True

class PatientConsentCreate(BaseModel):
    treatment_id: Optional[PositiveId] = None
    title: NameText
    content: ClinicalText
    signer_name: NameText
    signer_document: Optional[DocumentText] = ""
    signature_data: SignatureText

    _valid_signature = validator("signature_data", allow_reuse=True)(validate_signature)

class PatientConsent(BaseModel):
    id: int
    patient_id: int
    treatment_id: Optional[int] = None
    title: str
    content: str
    signer_name: str
    signer_document: str = ""
    signature_data: str
    signed_at: datetime
    created_by: str = ""
    class Config:
        orm_mode = True

class ClinicalReadiness(BaseModel):
    complete: bool
    missing_fields: List[str] = Field(default_factory=list)

class TreatmentBase(BaseModel):
    name: NameText
    tooth: Optional[constr(strip_whitespace=True, max_length=2, regex=r"^(|[1-8][1-8])$")] = ""
    status: Optional[TreatmentStatus] = TreatmentStatus.proposed
    amount: Optional[MoneyAmount] = 0
    base_amount: Optional[MoneyAmount] = 0
    discount_percent: Optional[Percentage] = 0
    notes: Optional[ClinicalText] = ""
    catalog_item_id: Optional[PositiveId] = None
    odontogram_reference: Optional[ClinicalText] = ""
    odontogram_surfaces: Optional[JsonText] = "[]"

    _valid_surfaces = validator("odontogram_surfaces", allow_reuse=True)(validate_surfaces_json)

    @validator("tooth")
    def valid_tooth(cls, value):
        if value and value not in ALL_TEETH:
            raise ValueError("La pieza dental no usa una numeración FDI válida.")
        return value

class TreatmentCreate(TreatmentBase):
    pass

class TreatmentUpdate(BaseModel):
    name: Optional[NameText] = None
    tooth: Optional[constr(strip_whitespace=True, max_length=2, regex=r"^(|[1-8][1-8])$")] = None
    status: Optional[TreatmentStatus] = None
    amount: Optional[MoneyAmount] = None
    base_amount: Optional[MoneyAmount] = None
    discount_percent: Optional[Percentage] = None
    notes: Optional[ClinicalText] = None
    catalog_item_id: Optional[PositiveId] = None
    odontogram_reference: Optional[ClinicalText] = None
    odontogram_surfaces: Optional[JsonText] = None

    _valid_surfaces = validator("odontogram_surfaces", allow_reuse=True)(lambda value: validate_surfaces_json(value) if value is not None else value)

    @validator("tooth")
    def valid_tooth(cls, value):
        if value and value not in ALL_TEETH:
            raise ValueError("La pieza dental no usa una numeración FDI válida.")
        return value

class Treatment(TreatmentBase):
    id: int
    patient_id: int
    paid_amount: float = 0
    balance_amount: float = 0
    payment_status: str = "pending"
    created_at: datetime
    updated_at: datetime
    class Config:
        orm_mode = True

class PrescriptionBase(BaseModel):
    professional: Optional[OptionalNameText] = ""
    diagnosis: Optional[ClinicalText] = ""
    medications: JsonText
    general_instructions: Optional[ClinicalText] = ""
    status: Optional[constr(regex=r"^(draft|sent)$")] = "draft"

    _valid_medications = validator("medications", allow_reuse=True)(validate_medications_json)

class PrescriptionCreate(PrescriptionBase):
    pass

class Prescription(PrescriptionBase):
    id: int
    patient_id: int
    sent_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    class Config:
        orm_mode = True

class TreatmentCatalogBase(BaseModel):
    name: NameText
    default_amount: MoneyAmount = 0
    active: bool = True

class TreatmentCatalogCreate(TreatmentCatalogBase):
    pass

class TreatmentCatalogUpdate(BaseModel):
    name: Optional[NameText] = None
    default_amount: Optional[MoneyAmount] = None
    active: Optional[bool] = None

class TreatmentCatalog(TreatmentCatalogBase):
    id: int
    clinic_id: int
    created_at: datetime
    updated_at: datetime
    class Config:
        orm_mode = True

class PaymentBase(BaseModel):
    patient_id: Optional[PositiveId] = None
    treatment_id: Optional[PositiveId] = None
    type: Optional[PaymentType] = PaymentType.income
    concept: RequiredShortText
    amount: PositiveMoneyAmount
    method: Optional[constr(regex=r"^(cash|card|transfer|other)$")] = "cash"
    business_date: Optional[date] = None

class PaymentCreate(PaymentBase):
    pass

class Payment(PaymentBase):
    id: int
    created_at: datetime
    class Config:
        orm_mode = True

class CashClosingCreate(BaseModel):
    business_date: date
    notes: Optional[ShortText] = ""

class CashClosing(BaseModel):
    id: int
    business_date: date
    income_total: MoneyAmount
    expense_total: MoneyAmount
    balance_total: float
    cash_available: float
    movement_count: int
    notes: str = ""
    closed_by: str
    closed_at: datetime
    class Config:
        orm_mode = True

class InventoryItemBase(BaseModel):
    name: NameText
    sku: Optional[constr(strip_whitespace=True, max_length=80, regex=r"^[A-Za-z0-9._/-]*$")] = ""
    quantity: Optional[QuantityAmount] = 0
    min_stock: Optional[QuantityAmount] = 0
    max_stock: Optional[QuantityAmount] = 0
    expiry_date: Optional[date] = None
    supplier: Optional[OptionalNameText] = ""
    unit_cost: Optional[MoneyAmount] = 0

class InventoryItemCreate(InventoryItemBase):
    @root_validator
    def validate_stock_range(cls, values):
        minimum, maximum = values.get("min_stock"), values.get("max_stock")
        if maximum and minimum is not None and maximum < minimum:
            raise ValueError("El stock máximo no puede ser menor que el mínimo.")
        return values

class InventoryItemUpdate(BaseModel):
    name: Optional[NameText] = None
    sku: Optional[constr(strip_whitespace=True, max_length=80, regex=r"^[A-Za-z0-9._/-]*$")] = None
    quantity: Optional[QuantityAmount] = None
    min_stock: Optional[QuantityAmount] = None
    max_stock: Optional[QuantityAmount] = None
    expiry_date: Optional[date] = None
    supplier: Optional[OptionalNameText] = None
    unit_cost: Optional[MoneyAmount] = None

class InventoryItem(InventoryItemBase):
    id: int
    updated_at: datetime
    class Config:
        orm_mode = True
