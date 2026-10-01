from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from pydantic import BaseModel

class ProviderCapabilities(BaseModel):
    supports_text: bool
    supports_html: bool
    supports_templates: bool
    supports_delivery_events: bool
    supports_read_events: bool
    supports_attachments: bool

class OutboundMessage(BaseModel):
    message_id: str
    campaign_id: str
    recipient_id: str
    channel: str
    recipient_identifier: str
    subject: Optional[str] = None
    body: str
    sender_identity: Optional[str] = None
    metadata: Dict[str, Any] = {}

class ProviderSendResult(BaseModel):
    success: bool
    provider_message_id: Optional[str] = None
    status: str # 'SENT', 'FAILED'
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    raw_response: Dict[str, Any] = {}

class MessagingProvider(ABC):
    @abstractmethod
    async def validate_recipient(self, identifier: str) -> tuple[bool, Optional[str]]:
        """Validates recipient format. Returns (is_valid, normalized_or_error)"""
        pass

    @abstractmethod
    async def send_message(self, message: OutboundMessage) -> ProviderSendResult:
        """Sends an outbound message to provider API or simulator"""
        pass

    @abstractmethod
    def get_capabilities(self) -> ProviderCapabilities:
        """Returns provider capabilities"""
        pass
