from typing import Any, Generic, Optional, TypeVar

from pydantic import BaseModel

DataT = TypeVar("DataT")


class APIResponse(BaseModel, Generic[DataT]):
    success: bool
    data: Optional[DataT] = None
    message: str = ""
    errors: list[Any] = []


class ErrorResponse(BaseModel):
    success: bool = False
    message: str = "An error occurred"
    errors: list[Any] = []
