import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, Set, Optional, Callable, Any
from ..database import get_db_connection
from ..adapters.base import OutboundMessage
from ..adapters.gmail import GmailAdapter
from ..adapters.whatsapp import WhatsAppAdapter

logger = logging.getLogger("AutoMessageQueue")

class CampaignQueueEngine:
    def __init__(self):
        self.active_tasks: Dict[str, asyncio.Task] = {}
        self.paused_campaigns: Set[str] = set()
        self.cancelled_campaigns: Set[str] = set()
        self.sse_subscribers: Dict[str, Set[asyncio.Queue]] = {}

    def subscribe(self, campaign_id: str) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue()
        self.sse_subscribers.setdefault(campaign_id, set()).add(q)
        return q

    def unsubscribe(self, campaign_id: str, q: asyncio.Queue):
        if campaign_id in self.sse_subscribers:
            self.sse_subscribers[campaign_id].discard(q)

    async def broadcast_event(self, campaign_id: str, event_type: str, data: Dict[str, Any]):
        subscribers = self.sse_subscribers.get(campaign_id, set())
        payload = json.dumps({"event": event_type, "data": data})
        for q in list(subscribers):
            try:
                await q.put(payload)
            except Exception:
                pass

    def start_campaign(self, campaign_id: str):
        if campaign_id in self.active_tasks and not self.active_tasks[campaign_id].done():
            return # already running
        self.paused_campaigns.discard(campaign_id)
        self.cancelled_campaigns.discard(campaign_id)
        task = asyncio.create_task(self._run_campaign(campaign_id))
        self.active_tasks[campaign_id] = task

    def pause_campaign(self, campaign_id: str):
        self.paused_campaigns.add(campaign_id)
        conn = get_db_connection()
        try:
            conn.execute("UPDATE campaigns SET status = 'PAUSED' WHERE id = ?", (campaign_id,))
            conn.commit()
        finally:
            conn.close()

    def resume_campaign(self, campaign_id: str):
        self.paused_campaigns.discard(campaign_id)
        conn = get_db_connection()
        try:
            conn.execute("UPDATE campaigns SET status = 'RUNNING' WHERE id = ?", (campaign_id,))
            conn.commit()
        finally:
            conn.close()
        if campaign_id not in self.active_tasks or self.active_tasks[campaign_id].done():
            self.start_campaign(campaign_id)

    def cancel_campaign(self, campaign_id: str):
        self.cancelled_campaigns.add(campaign_id)
        self.paused_campaigns.discard(campaign_id)
        conn = get_db_connection()
        try:
            conn.execute("""
            UPDATE messages SET status = 'CANCELLED' 
            WHERE campaign_id = ? AND status IN ('QUEUED', 'PROCESSING')
            """, (campaign_id,))
            conn.execute("UPDATE campaigns SET status = 'CANCELLED', completed_at = ? WHERE id = ?", 
                         (datetime.utcnow().isoformat(), campaign_id))
            conn.commit()
        finally:
            conn.close()

    async def retry_failed(self, campaign_id: str):
        conn = get_db_connection()
        try:
            conn.execute("""
            UPDATE messages SET status = 'QUEUED', attempt_count = attempt_count + 1, last_error_code = NULL, last_error_message = NULL
            WHERE campaign_id = ? AND status = 'FAILED'
            """, (campaign_id,))
            conn.execute("UPDATE campaigns SET status = 'RUNNING' WHERE id = ?", (campaign_id,))
            conn.commit()
        finally:
            conn.close()
        self.start_campaign(campaign_id)

    async def _run_campaign(self, campaign_id: str):
        conn = get_db_connection()
        try:
            campaign = conn.execute("SELECT * FROM campaigns WHERE id = ?", (campaign_id,)).fetchone()
            if not campaign:
                return

            channel = campaign["channel"]
            throttle_delay = float(campaign["throttle_delay_sec"] or 0.8)
            sender_identity = campaign["sender_identity"]
            
            # Mark campaign as running
            now = datetime.utcnow().isoformat()
            conn.execute("UPDATE campaigns SET status = 'RUNNING', started_at = coalesce(started_at, ?) WHERE id = ?", (now, campaign_id))
            conn.commit()
        finally:
            conn.close()

        # Instantiate provider adapter from DB integration settings
        conn = get_db_connection()
        try:
            integ = conn.execute("SELECT * FROM integrations WHERE provider = ?", (channel,)).fetchone()
        finally:
            conn.close()

        is_sim = bool(integ["is_simulated"]) if (integ and integ["is_simulated"] is not None) else True

        if channel == "gmail":
            adapter = GmailAdapter(
                is_simulated=is_sim,
                access_token=integ["access_token_encrypted"] if integ else None,
                smtp_email=integ["account_identifier"] if integ else None,
                smtp_password=integ["refresh_token_encrypted"] if integ else None
            )
        else:
            adapter = WhatsAppAdapter(
                is_simulated=is_sim,
                phone_number_id=integ["phone_number_id"] if integ else None,
                access_token=integ["access_token_encrypted"] if integ else None
            )

        await self.broadcast_event(campaign_id, "CAMPAIGN_STARTED", {"campaign_id": campaign_id, "status": "RUNNING"})

        while True:
            # Check if cancelled
            if campaign_id in self.cancelled_campaigns:
                break

            # Check if paused
            if campaign_id in self.paused_campaigns:
                await asyncio.sleep(0.5)
                continue

            # Fetch next queued message with short-lived connection
            conn = get_db_connection()
            try:
                msg_row = conn.execute("""
                SELECT m.*, r.name as recipient_name 
                FROM messages m
                JOIN recipients r ON m.recipient_id = r.id
                WHERE m.campaign_id = ? AND m.status = 'QUEUED'
                ORDER BY m.created_at ASC
                LIMIT 1
                """, (campaign_id,)).fetchone()

                if not msg_row:
                    break

                message_id = msg_row["id"]
                recipient_id = msg_row["recipient_id"]
                recipient_identifier = msg_row["recipient_identifier"]
                recipient_name = msg_row["recipient_name"]
                rendered_subject = msg_row["rendered_subject"]
                rendered_body = msg_row["rendered_body"]

                # 1. Transition to PROCESSING
                processing_time = datetime.utcnow().isoformat()
                conn.execute("UPDATE messages SET status = 'PROCESSING', updated_at = ? WHERE id = ?", (processing_time, message_id))
                conn.commit()
            finally:
                conn.close()
            
            await self.broadcast_event(campaign_id, "MESSAGE_STATUS", {
                "message_id": message_id,
                "status": "PROCESSING",
                "recipient_identifier": recipient_identifier
            })

            # 2. Build OutboundMessage and Dispatch via Adapter (without holding DB lock)
            outbound = OutboundMessage(
                message_id=message_id,
                campaign_id=campaign_id,
                recipient_id=recipient_id,
                channel=channel,
                recipient_identifier=recipient_identifier,
                subject=rendered_subject,
                body=rendered_body,
                sender_identity=sender_identity
            )

            result = await adapter.send_message(outbound)
            event_time = datetime.utcnow().isoformat()

            conn = get_db_connection()
            try:
                if result.success:
                    conn.execute("""
                    UPDATE messages 
                    SET status = 'SENT', provider_message_id = ?, sent_at = ?, updated_at = ?
                    WHERE id = ?
                    """, (result.provider_message_id, event_time, event_time, message_id))

                    conn.execute("""
                    INSERT INTO message_events (id, message_id, campaign_id, provider, event_type, provider_event_id, payload_json, created_at)
                    VALUES (?, ?, ?, ?, 'SENT', ?, ?, ?)
                    """, (f"evt_{datetime.utcnow().timestamp()}", message_id, campaign_id, channel, result.provider_message_id, json.dumps(result.raw_response), event_time))
                    conn.commit()
                else:
                    conn.execute("""
                    UPDATE messages 
                    SET status = 'FAILED', last_error_code = ?, last_error_message = ?, failed_at = ?, updated_at = ?
                    WHERE id = ?
                    """, (result.error_code, result.error_message, event_time, event_time, message_id))

                    conn.execute("""
                    INSERT INTO message_events (id, message_id, campaign_id, provider, event_type, payload_json, created_at)
                    VALUES (?, ?, ?, ?, 'FAILED', ?, ?)
                    """, (f"evt_{datetime.utcnow().timestamp()}", message_id, campaign_id, channel, json.dumps({"error": result.error_message}), event_time))
                    conn.commit()

                # Update counts
                self._recalculate_campaign_counts(conn, campaign_id)
            finally:
                conn.close()

            if result.success:
                await self.broadcast_event(campaign_id, "MESSAGE_STATUS", {
                    "message_id": message_id,
                    "status": "SENT",
                    "provider_message_id": result.provider_message_id,
                    "recipient_identifier": recipient_identifier,
                    "recipient_name": recipient_name
                })

                if channel == "whatsapp":
                    asyncio.create_task(self._simulate_whatsapp_webhooks(campaign_id, message_id, result.provider_message_id))
            else:
                await self.broadcast_event(campaign_id, "MESSAGE_STATUS", {
                    "message_id": message_id,
                    "status": "FAILED",
                    "error_code": result.error_code,
                    "error_message": result.error_message,
                    "recipient_identifier": recipient_identifier
                })

            # Throttle delay between messages without holding DB connection
            await asyncio.sleep(throttle_delay)

        # Final check if all messages processed
        conn = get_db_connection()
        try:
            remaining = conn.execute("SELECT COUNT(*) FROM messages WHERE campaign_id = ? AND status = 'QUEUED'", (campaign_id,)).fetchone()[0]
            if remaining == 0 and campaign_id not in self.cancelled_campaigns and campaign_id not in self.paused_campaigns:
                completed_time = datetime.utcnow().isoformat()
                conn.execute("UPDATE campaigns SET status = 'COMPLETED', completed_at = ? WHERE id = ?", (completed_time, campaign_id))
                conn.commit()
                await self.broadcast_event(campaign_id, "CAMPAIGN_COMPLETED", {"campaign_id": campaign_id, "status": "COMPLETED"})
        finally:
            conn.close()

    async def _simulate_whatsapp_webhooks(self, campaign_id: str, message_id: str, wamid: Optional[str]):
        """Simulates Meta Cloud API Webhook updates (delivered and read)."""
        await asyncio.sleep(1.6) # Delay until delivered
        conn = get_db_connection()
        try:
            delivered_time = datetime.utcnow().isoformat()
            conn.execute("UPDATE messages SET status = 'DELIVERED', delivered_at = ?, updated_at = ? WHERE id = ? AND status = 'SENT'",
                         (delivered_time, delivered_time, message_id))
            self._recalculate_campaign_counts(conn, campaign_id)
            conn.commit()
        finally:
            conn.close()

        await self.broadcast_event(campaign_id, "MESSAGE_STATUS", {"message_id": message_id, "status": "DELIVERED"})

        await asyncio.sleep(2.0) # Delay until read
        conn = get_db_connection()
        try:
            read_time = datetime.utcnow().isoformat()
            conn.execute("UPDATE messages SET status = 'READ', read_at = ?, updated_at = ? WHERE id = ? AND status = 'DELIVERED'",
                         (read_time, read_time, message_id))
            self._recalculate_campaign_counts(conn, campaign_id)
            conn.commit()
        finally:
            conn.close()

        await self.broadcast_event(campaign_id, "MESSAGE_STATUS", {"message_id": message_id, "status": "READ"})

    def _recalculate_campaign_counts(self, conn, campaign_id: str):
        counts = conn.execute("""
        SELECT 
            SUM(CASE WHEN status = 'QUEUED' THEN 1 ELSE 0 END) as q,
            SUM(CASE WHEN status = 'PROCESSING' THEN 1 ELSE 0 END) as p,
            SUM(CASE WHEN status = 'SENT' THEN 1 ELSE 0 END) as s,
            SUM(CASE WHEN status = 'DELIVERED' THEN 1 ELSE 0 END) as d,
            SUM(CASE WHEN status = 'READ' THEN 1 ELSE 0 END) as r,
            SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as f
        FROM messages WHERE campaign_id = ?
        """, (campaign_id,)).fetchone()

        conn.execute("""
        UPDATE campaigns 
        SET queued_count = ?, processing_count = ?, sent_count = ?, delivered_count = ?, read_count = ?, failed_count = ?
        WHERE id = ?
        """, (counts["q"] or 0, counts["p"] or 0, counts["s"] or 0, counts["d"] or 0, counts["r"] or 0, counts["f"] or 0, campaign_id))
        conn.commit()

# Global engine instance
queue_engine = CampaignQueueEngine()
