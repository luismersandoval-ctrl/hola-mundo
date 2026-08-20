from enum import Enum

from pydantic import condecimal, confloat, conint, constr


PositiveId = conint(strict=True, gt=0)
PageOffset = conint(ge=0, le=100_000)
PageLimit = conint(ge=1, le=500)
NameText = constr(strip_whitespace=True, min_length=1, max_length=100)
OptionalNameText = constr(strip_whitespace=True, max_length=100)
UsernameText = constr(strip_whitespace=True, min_length=4, max_length=40, regex=r"^[a-zA-Z0-9._-]+$")
EmailText = constr(strip_whitespace=True, to_lower=True, max_length=254, regex=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
OptionalEmailText = constr(strip_whitespace=True, to_lower=True, max_length=254, regex=r"^(|[^\s@]+@[^\s@]+\.[^\s@]+)$")
PasswordText = constr(min_length=10, max_length=128)
PhoneText = constr(strip_whitespace=True, max_length=20, regex=r"^\+?[0-9]{0,18}$")
DocumentText = constr(strip_whitespace=True, max_length=40, regex=r"^[A-Za-z0-9._ -]*$")
DateText = constr(strip_whitespace=True, max_length=10, regex=r"^(|\d{4}-\d{2}-\d{2})$")
ShortText = constr(strip_whitespace=True, max_length=500)
RequiredShortText = constr(strip_whitespace=True, min_length=1, max_length=500)
ClinicalText = constr(strip_whitespace=True, max_length=12_000)
JsonText = constr(strip_whitespace=True, min_length=2, max_length=250_000)
SignatureText = constr(min_length=100, max_length=1_500_000)
MoneyAmount = condecimal(ge=0, le=1_000_000_000, max_digits=15, decimal_places=2)
PositiveMoneyAmount = condecimal(gt=0, le=1_000_000_000, max_digits=15, decimal_places=2)
QuantityAmount = confloat(ge=0, le=100_000_000, allow_inf_nan=False)
Percentage = confloat(ge=0, le=100, allow_inf_nan=False)


class Gender(str, Enum):
    male = "male"
    female = "female"
    other = "other"
    unspecified = "unspecified"


class StaffRole(str, Enum):
    administrative = "administrative"
    dentist = "dentist"
    specialist = "specialist"


class AppointmentStatus(str, Enum):
    pending = "pending"
    confirmed = "confirmed"
    in_room = "in_room"
    completed = "completed"
    cancelled = "cancelled"
    no_show = "no_show"


class TreatmentStatus(str, Enum):
    proposed = "proposed"
    accepted = "accepted"
    in_progress = "in_progress"
    completed = "completed"
    rejected = "rejected"


class PaymentType(str, Enum):
    income = "income"
    expense = "expense"


class MessageDirection(str, Enum):
    incoming = "in"
    outgoing = "out"
