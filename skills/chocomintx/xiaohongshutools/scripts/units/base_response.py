from typing import Generic, TypeVar, Optional
from pydantic import BaseModel, Field

T = TypeVar('T')

class BaseResponse(BaseModel, Generic[T]):
    code: int = Field(..., description="状态码")
    message: str = Field(..., description="提示信息")
    info: Optional[str] = Field(None, description="附加信息")
    data: Optional[T] = Field(None, description="业务数据")

    class Config:
        json_schema_extra = {
            "example": {
                "code": 200,
                "message": "成功",
                "info": "操作成功完成",
                "data": {"key": "value"}
            }
        }