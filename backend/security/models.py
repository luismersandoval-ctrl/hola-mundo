import unicodedata
from typing import Any

from pydantic import BaseModel, root_validator


MAX_INPUT_DEPTH = 12
MAX_COLLECTION_ITEMS = 5000


def _validate_input_tree(value: Any, depth: int = 0) -> Any:
    if depth > MAX_INPUT_DEPTH:
        raise ValueError("La estructura enviada es demasiado profunda.")
    if isinstance(value, str):
        if "\x00" in value:
            raise ValueError("El valor contiene un byte nulo no permitido.")
        for character in value:
            category = unicodedata.category(character)
            if category == "Cc" and character not in "\n\r\t":
                raise ValueError("El valor contiene caracteres de control no permitidos.")
        return unicodedata.normalize("NFC", value)
    if isinstance(value, dict):
        if len(value) > MAX_COLLECTION_ITEMS:
            raise ValueError("La estructura contiene demasiados elementos.")
        return {key: _validate_input_tree(item, depth + 1) for key, item in value.items()}
    if isinstance(value, (list, tuple, set)):
        if len(value) > MAX_COLLECTION_ITEMS:
            raise ValueError("La estructura contiene demasiados elementos.")
        return type(value)(_validate_input_tree(item, depth + 1) for item in value)
    return value


class SecureInputModel(BaseModel):
    @root_validator(pre=True)
    def reject_unsafe_structure(cls, values):
        return _validate_input_tree(values)

    class Config:
        extra = "forbid"
        validate_assignment = True
        anystr_strip_whitespace = False
        max_anystr_length = 100_000


class SecureORMModel(SecureInputModel):
    class Config(SecureInputModel.Config):
        orm_mode = True
