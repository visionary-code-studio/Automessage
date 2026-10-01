from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime

class TemplateCreate(BaseModel):
    name: str
    channel: str # 'gmail' or 'whatsapp'
    subject: Optional[str] = None
    body: str
    category: Optional[str] = "general"

class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    category: Optional[str] = None

class TemplateResponse(BaseModel):
    id: str
    name: str
    channel: str
    subject: Optional[str]
    body: str
    category: Optional[str]
    variables: List[str]
    created_at: str
    updated_at: str

class ColumnMapping(BaseModel):
    field: str # 'email', 'phone', 'name', or variable name
    spreadsheet_column: str

class ValidationRowDiagnostic(BaseModel):
    row_number: int
    name: Optional[str] = None
    identifier: Optional[str] = None
    status: str # 'VALID', 'INVALID', 'DUPLICATE'
    error: Optional[str] = None
    variables: Dict[str, Any] = {}

class ValidationReport(BaseModel):
    total_rows: int
    valid_count: int
    invalid_count: int
    duplicate_count: int
    missing_variables_count: int
    sample_rows: List[ValidationRowDiagnostic]
    available_variables: List[str]

class CampaignCreate(BaseModel):
    name: str
    channel: str # 'gmail' or 'whatsapp'
    sender_identity: Optional[str] = None
    subject: Optional[str] = None
    template_body: str
    column_mapping: Dict[str, str] # e.g. {'name': 'Full Name', 'email': 'Email Address'}
    raw_data: List[Dict[str, Any]]
    source_filename: Optional[str] = "uploaded_recipients.csv"
    throttle_delay_sec: Optional[float] = 0.8

class CampaignResponse(BaseModel):
    id: str
    name: str
    channel: str
    status: str
    sender_identity: Optional[str]
    subject: Optional[str]
    template_body: str
    source_filename: Optional[str]
    total_recipients: int
    valid_count: int
    invalid_count: int
    duplicate_count: int
    queued_count: int
    processing_count: int
    sent_count: int
    delivered_count: int
    read_count: int
    failed_count: int
    throttle_delay_sec: float
    created_at: str
    started_at: Optional[str]
    completed_at: Optional[str]

class RecipientItem(BaseModel):
    id: str
    campaign_id: str
    row_number: int
    name: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    variables: Dict[str, Any]
    validation_status: str
    validation_error: Optional[str]

class MessageItem(BaseModel):
    id: str
    campaign_id: str
    recipient_id: str
    channel: str
    recipient_identifier: str
    name: Optional[str]
    rendered_subject: Optional[str]
    rendered_body: str
    status: str
    provider_message_id: Optional[str]
    attempt_count: int
    last_error_code: Optional[str]
    last_error_message: Optional[str]
    queued_at: Optional[str]
    sent_at: Optional[str]
    delivered_at: Optional[str]
    read_at: Optional[str]
    failed_at: Optional[str]
    created_at: str

class AIDraftRequest(BaseModel):
    channel: str # 'gmail' or 'whatsapp'
    goal: str
    tone: Optional[str] = "professional" # 'professional', 'friendly', 'urgent', 'persuasive'
    audience: Optional[str] = "general"
    key_details: Optional[str] = None

class AIDraftResponse(BaseModel):
    subject: Optional[str] = None
    body: str
    suggested_variables: List[str]
    whatsapp_format: Optional[str] = None

class WebhookWhatsAppEvent(BaseModel):
    event_type: str # 'sent', 'delivered', 'read', 'failed'
    provider_message_id: str
    recipient_phone: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
