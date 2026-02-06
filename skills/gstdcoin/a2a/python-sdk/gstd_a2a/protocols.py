from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List, Union

# --- Standard Protocol Definitions (The "Language" of Agents) ---

class BaseTaskPayload(BaseModel):
    """Base schema for all tasks to ensure agents speak the same language"""
    protocol_version: str = "1.0"
    
    class Config:
        extra = "allow"

# 1. Text Processing Protocol
class TextProcessingTask(BaseTaskPayload):
    text: str = Field(..., description="The input text content to process")
    instruction: str = Field(..., description="What to do with the text")
    language: Optional[str] = "en"
    format: Optional[str] = "markdown"

# 2. Image Generation Protocol
class ImageGenerationTask(BaseTaskPayload):
    prompt: str = Field(..., description="The image generation prompt")
    width: int = 1024
    height: int = 1024
    steps: int = 30
    model: Optional[str] = "stable-diffusion-xl"

# 3. Data Scraping Protocol
class DataScrapingTask(BaseTaskPayload):
    url: str = Field(..., description="Target URL to scrape")
    selectors: Optional[List[str]] = Field(None, description="CSS selectors to extract")
    actions: Optional[List[Dict[str, Any]]] = Field(None, description="Interaction steps (click, wait)")

# 4. OpenClaw Physical Control Protocol
class OpenClawTask(BaseTaskPayload):
    device_id: str = Field(..., description="Target device identifier")
    command: str = Field(..., description="Command to execute (e.g., 'move_arm', 'read_sensor')")
    parameters: Dict[str, Any] = Field(default_factory=dict)

# 5. Settlement Protocol (Invoicing)
class InvoiceTask(BaseTaskPayload):
    amount_gstd: float = Field(..., description="Amount of GSTD to be paid")
    description: str = Field(..., description="Reason for the invoice")
    issuer_address: str = Field(..., description="Wallet address of the service provider")
    payer_address: str = Field(..., description="Wallet address of the client")
    task_id: Optional[str] = Field(None, description="Optional linked task ID")

# --- Registry ---
TASK_SCHEMAS = {
    "text-processing": TextProcessingTask,
    "image-generation": ImageGenerationTask,
    "data-scraping": DataScrapingTask,
    "openclaw-control": OpenClawTask,
    "settlement-invoice": InvoiceTask
}

def validate_task_payload(task_type: str, payload: Dict[str, Any]) -> bool:
    """Ensures the payload matches the strict protocol definition for the task type"""
    schema = TASK_SCHEMAS.get(task_type)
    if not schema:
        # Unknown protocol - allow but warn
        return True 
    try:
        schema(**payload)
        return True
    except Exception:
        return False
