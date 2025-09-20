from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime

class InventoryItem(BaseModel):
    id: str
    name: str
    currentStock: int
    unit: str
    status: Optional[str] = None
    minStock: int
    maxStock: int
    description: Optional[str] = None
    category: Optional[str] = None
    location: Optional[str] = None
    supplier: Optional[str] = None
    lastUpdated: Optional[datetime] = None
    price: Optional[float] = None

    class Config:
        extra = "ignore"  # Allow extra fields without validation error

class UsageLog(BaseModel):
    id: str
    itemId: str
    quantity: int
    user: str
    timestamp: datetime
    notes: Optional[str] = None

class VoiceCommand(BaseModel):
    type: str
    item: Optional[str] = None
    quantity: Optional[int] = None
    notes: Optional[str] = None

class VoiceResponse(BaseModel):
    message: str
    success: bool
    data: Optional[Dict[str, Any]] = None

class AudioData(BaseModel):
    audio: bytes
    language: Optional[str] = "en"

class ProcessVoiceRequest(BaseModel):
    audio: str
    language: Optional[str] = "en"

class ProcessVoiceResponse(BaseModel):
    transcript: str
    command: VoiceCommand
    response: VoiceResponse
    audio_response: Optional[str] = None


class Supplier(BaseModel):
    id: str
    name: str
    email: str
    phone: str
    address: str
    paymentTerms: str
    leadTimeDays: int
    minimumOrder: float


class PurchaseOrderItem(BaseModel):
    itemId: str
    itemName: str
    quantity: int
    unitPrice: float
    totalPrice: float
    urgency: str


class PurchaseOrder(BaseModel):
    id: str
    orderNumber: str
    supplierId: str
    supplierName: str
    status: str
    items: List[PurchaseOrderItem]
    subtotal: float
    tax: float
    total: float
    createdBy: str
    createdAt: datetime
    expectedDelivery: datetime
    notes: Optional[str] = None
    approvedBy: Optional[str] = None
    approvedAt: Optional[datetime] = None
