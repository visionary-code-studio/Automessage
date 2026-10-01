import re
import asyncio
import base64
import uuid
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Tuple
from .base import MessagingProvider, OutboundMessage, ProviderSendResult, ProviderCapabilities

class GmailAdapter(MessagingProvider):
    def __init__(
        self,
        is_simulated: bool = True,
        access_token: Optional[str] = None,
        smtp_email: Optional[str] = None,
        smtp_password: Optional[str] = None
    ):
        self.is_simulated = is_simulated
        self.access_token = access_token
        self.smtp_email = smtp_email
        self.smtp_password = smtp_password

    async def validate_recipient(self, identifier: str) -> Tuple[bool, Optional[str]]:
        if not identifier:
            return False, "Recipient email is empty"
        identifier = identifier.strip()
        email_regex = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
        if not re.match(email_regex, identifier):
            return False, f"Invalid email format: '{identifier}'"
        return True, identifier.lower()

    def create_mime_message(self, message: OutboundMessage) -> Tuple[MIMEMultipart, str]:
        """Constructs an RFC 2822 MIME message and Base64URL encodes it."""
        sender = self.smtp_email or message.sender_identity or "noreply@automessage.app"
        msg = MIMEMultipart("alternative")
        msg["To"] = message.recipient_identifier
        msg["From"] = sender
        msg["Subject"] = message.subject or "Notification"
        
        # Add plain text fallback and HTML body
        plain_text = re.sub(r"<[^>]+>", "", message.body)
        part1 = MIMEText(plain_text, "plain")
        part2 = MIMEText(message.body, "html")
        msg.attach(part1)
        msg.attach(part2)

        raw_bytes = msg.as_bytes()
        encoded = base64.urlsafe_b64encode(raw_bytes).decode("utf-8")
        return msg, encoded

    async def send_message(self, message: OutboundMessage) -> ProviderSendResult:
        is_valid, norm_or_err = await self.validate_recipient(message.recipient_identifier)
        if not is_valid:
            return ProviderSendResult(
                success=False,
                status="FAILED",
                error_code="INVALID_RECIPIENT_EMAIL",
                error_message=norm_or_err
            )

        mime_obj, encoded_mime = self.create_mime_message(message)

        if self.is_simulated:
            # Realistic simulation mode
            await asyncio.sleep(0.18)

            if "bounce" in message.recipient_identifier or "fail" in message.recipient_identifier:
                return ProviderSendResult(
                    success=False,
                    status="FAILED",
                    error_code="SMTP_550_USER_NOT_FOUND",
                    error_message=f"Mailbox unavailable: 550 5.1.1 User {message.recipient_identifier} not found on remote server",
                    raw_response={"simulated": True, "code": 550}
                )

            provider_msg_id = f"18d{uuid.uuid4().hex[:13]}"
            return ProviderSendResult(
                success=True,
                provider_message_id=provider_msg_id,
                status="SENT",
                raw_response={
                    "id": provider_msg_id,
                    "threadId": f"18d{uuid.uuid4().hex[:13]}",
                    "labelIds": ["SENT"],
                    "simulated": True
                }
            )

        # ---------------- REAL SENDING MODES ----------------
        # Mode 1: Real Gmail SMTP via App Password
        if self.smtp_email and self.smtp_password:
            try:
                def send_smtp_sync():
                    with smtplib.SMTP("smtp.gmail.com", 587, timeout=15) as server:
                        server.starttls()
                        server.login(self.smtp_email, self.smtp_password)
                        server.send_message(mime_obj)
                
                await asyncio.to_thread(send_smtp_sync)
                provider_msg_id = f"gmail_smtp_{uuid.uuid4().hex[:12]}"
                return ProviderSendResult(
                    success=True,
                    provider_message_id=provider_msg_id,
                    status="SENT",
                    raw_response={"channel": "gmail_smtp", "sender": self.smtp_email}
                )
            except Exception as e:
                return ProviderSendResult(
                    success=False,
                    status="FAILED",
                    error_code="GMAIL_SMTP_ERROR",
                    error_message=str(e),
                    raw_response={"error": str(e)}
                )

        # Mode 2: Real Google OAuth2 REST API (messages.send)
        elif self.access_token:
            import httpx
            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json"
            }
            payload = {"raw": encoded_mime}
            try:
                async with httpx.AsyncClient() as client:
                    resp = await client.post(
                        "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
                        headers=headers,
                        json=payload,
                        timeout=15.0
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        return ProviderSendResult(
                            success=True,
                            provider_message_id=data.get("id"),
                            status="SENT",
                            raw_response=data
                        )
                    else:
                        return ProviderSendResult(
                            success=False,
                            status="FAILED",
                            error_code=f"GMAIL_API_{resp.status_code}",
                            error_message=resp.text,
                            raw_response={"status_code": resp.status_code, "body": resp.text}
                        )
            except Exception as e:
                return ProviderSendResult(
                    success=False,
                    status="FAILED",
                    error_code="GMAIL_NETWORK_ERROR",
                    error_message=str(e)
                )

        else:
            return ProviderSendResult(
                success=False,
                status="FAILED",
                error_code="CREDENTIALS_MISSING",
                error_message="No Gmail App Password or OAuth token configured. Please configure in Channels settings or enable Simulator Mode."
            )

    def get_capabilities(self) -> ProviderCapabilities:
        return ProviderCapabilities(
            supports_text=True,
            supports_html=True,
            supports_templates=True,
            supports_delivery_events=False,
            supports_read_events=False,
            supports_attachments=True
        )
