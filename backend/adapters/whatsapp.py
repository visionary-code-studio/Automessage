import re
import asyncio
import uuid
import httpx
import os
from typing import Optional, Tuple
from .base import MessagingProvider, OutboundMessage, ProviderSendResult, ProviderCapabilities

class WhatsAppAdapter(MessagingProvider):
    def __init__(
        self,
        is_simulated: bool = True,
        phone_number_id: Optional[str] = None,
        access_token: Optional[str] = None,
        bridge_url: Optional[str] = None
    ):
        self.is_simulated = is_simulated
        self.phone_number_id = phone_number_id
        self.access_token = access_token
        self.bridge_url = bridge_url or os.getenv("WHATSAPP_BRIDGE_URL", "http://127.0.0.1:3001")

    async def validate_recipient(self, identifier: str) -> Tuple[bool, Optional[str]]:
        if not identifier:
            return False, "Recipient phone number is empty"
        
        # Remove whitespace, parentheses, dashes
        cleaned = re.sub(r"[\s\(\)\-\.]", "", identifier)
        
        # E.164 check (7 to 15 digits)
        if not re.match(r"^\+?[1-9]\d{6,14}$", cleaned):
            return False, f"Invalid phone format: '{identifier}'. Must be standard international format (e.g. +14155552671 or +919876543210)"
        
        if not cleaned.startswith("+"):
            cleaned = "+" + cleaned
        return True, cleaned

    async def send_message(self, message: OutboundMessage) -> ProviderSendResult:
        is_valid, norm_or_err = await self.validate_recipient(message.recipient_identifier)
        if not is_valid:
            return ProviderSendResult(
                success=False,
                status="FAILED",
                error_code="INVALID_PHONE_NUMBER",
                error_message=norm_or_err
            )

        # ---------------- SIMULATOR MODE ----------------
        if self.is_simulated:
            await asyncio.sleep(0.20)

            if "0000" in message.recipient_identifier or "fail" in message.recipient_identifier:
                return ProviderSendResult(
                    success=False,
                    status="FAILED",
                    error_code="META_131026_MESSAGE_UNDELIVERABLE",
                    error_message="Recipient phone number not registered on WhatsApp or user has blocked messaging",
                    raw_response={"error": {"code": 131026, "type": "OAuthException"}}
                )

            wamid = f"wamid.HBgM{uuid.uuid4().hex[:16]}"
            return ProviderSendResult(
                success=True,
                provider_message_id=wamid,
                status="SENT",
                raw_response={
                    "messaging_product": "whatsapp",
                    "contacts": [{"input": norm_or_err, "wa_id": norm_or_err.replace("+", "")}],
                    "messages": [{"id": wamid}],
                    "simulated": True
                }
            )

        # ---------------- MODE 1: BAILEYS QR CODE BRIDGE ----------------
        # If no Meta Cloud API access token is provided, or if bridge is preferred:
        if not self.access_token or self.phone_number_id == "baileys_session":
            try:
                async with httpx.AsyncClient() as client:
                    resp = await client.post(
                        f"{self.bridge_url}/send",
                        json={"number": norm_or_err, "message": message.body},
                        timeout=25.0
                    )
                    data = resp.json()
                    if resp.status_code == 200 and data.get("success"):
                        return ProviderSendResult(
                            success=True,
                            provider_message_id=data.get("provider_message_id"),
                            status="SENT",
                            raw_response=data
                        )
                    else:
                        return ProviderSendResult(
                            success=False,
                            status="FAILED",
                            error_code="WHATSAPP_BRIDGE_ERROR",
                            error_message=data.get("error", "Failed to dispatch via WhatsApp Bridge"),
                            raw_response=data
                        )
            except Exception as e:
                return ProviderSendResult(
                    success=False,
                    status="FAILED",
                    error_code="BRIDGE_CONNECTION_FAILED",
                    error_message=f"WhatsApp Bridge is offline or unreachable: {str(e)}. Make sure the QR code bridge is running.",
                    raw_response={"error": str(e)}
                )

        # ---------------- MODE 2: META CLOUD API ----------------
        else:
            url = f"https://graph.facebook.com/v21.0/{self.phone_number_id}/messages"
            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json"
            }
            payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": norm_or_err.replace("+", ""),
                "type": "text",
                "text": {"preview_url": False, "body": message.body}
            }
            try:
                async with httpx.AsyncClient() as client:
                    resp = await client.post(url, headers=headers, json=payload, timeout=15.0)
                    if resp.status_code == 200:
                        data = resp.json()
                        wamid = data.get("messages", [{}])[0].get("id")
                        return ProviderSendResult(
                            success=True,
                            provider_message_id=wamid,
                            status="SENT",
                            raw_response=data
                        )
                    else:
                        return ProviderSendResult(
                            success=False,
                            status="FAILED",
                            error_code=f"META_API_{resp.status_code}",
                            error_message=resp.text,
                            raw_response={"status_code": resp.status_code, "body": resp.text}
                        )
            except Exception as e:
                return ProviderSendResult(
                    success=False,
                    status="FAILED",
                    error_code="META_NETWORK_ERROR",
                    error_message=str(e)
                )

    def get_capabilities(self) -> ProviderCapabilities:
        return ProviderCapabilities(
            supports_text=True,
            supports_html=False,
            supports_templates=True,
            supports_delivery_events=True,
            supports_read_events=True,
            supports_attachments=True
        )
