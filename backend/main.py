import os
import re
import json
import csv
import io
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, PlainTextResponse
import asyncio

from .database import init_db, get_db_connection
from .models import (
    TemplateCreate, TemplateResponse, CampaignCreate, CampaignResponse,
    ValidationReport, AIDraftRequest, AIDraftResponse, WebhookWhatsAppEvent
)
from .services.spreadsheet import parse_csv_content, parse_xlsx_content, infer_column_mappings
from .services.validator import validate_and_normalize_recipients, extract_template_variables
from .services.queue_engine import queue_engine
from .services.ai_assistant import generate_ai_draft

app = FastAPI(title="AutoMessage API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()

# ----------------- SYSTEM & DASHBOARD -----------------
@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "AutoMessage", "timestamp": datetime.utcnow().isoformat()}

@app.get("/api/stats")
def get_dashboard_stats():
    conn = get_db_connection()
    c_counts = conn.execute("""
    SELECT 
        COUNT(*) as total_campaigns,
        SUM(CASE WHEN status = 'RUNNING' THEN 1 ELSE 0 END) as active_campaigns,
        SUM(total_recipients) as total_recipients,
        SUM(sent_count) as total_sent,
        SUM(delivered_count) as total_delivered,
        SUM(read_count) as total_read,
        SUM(failed_count) as total_failed
    FROM campaigns
    """).fetchone()

    recent_campaigns = conn.execute("""
    SELECT * FROM campaigns ORDER BY created_at DESC LIMIT 6
    """).fetchall()

    conn.close()
    return {
        "metrics": {
            "total_campaigns": c_counts["total_campaigns"] or 0,
            "active_campaigns": c_counts["active_campaigns"] or 0,
            "total_recipients": c_counts["total_recipients"] or 0,
            "total_sent": c_counts["total_sent"] or 0,
            "total_delivered": c_counts["total_delivered"] or 0,
            "total_read": c_counts["total_read"] or 0,
            "total_failed": c_counts["total_failed"] or 0,
            "delivery_rate_pct": round((c_counts["total_delivered"] or 0) / max(1, c_counts["total_sent"] or 1) * 100, 1)
        },
        "recent_campaigns": [dict(r) for r in recent_campaigns]
    }

# ----------------- INTEGRATIONS -----------------
@app.get("/api/integrations")
def get_integrations():
    conn = get_db_connection()
    integrations = conn.execute("SELECT * FROM integrations").fetchall()
    conn.close()
    return [dict(i) for i in integrations]

@app.patch("/api/integrations/{id}")
def update_integration(id: str, payload: Dict[str, Any]):
    conn = get_db_connection()
    now = datetime.utcnow().isoformat()
    fields = []
    values = []
    for k, v in payload.items():
        if k in ["is_connected", "is_simulated", "account_identifier", "phone_number_id", "waba_id"]:
            fields.append(f"{k} = ?")
            values.append(v)
    if fields:
        fields.append("updated_at = ?")
        values.append(now)
        values.append(id)
        conn.execute(f"UPDATE integrations SET {', '.join(fields)} WHERE id = ?", values)
        conn.commit()
    res = conn.execute("SELECT * FROM integrations WHERE id = ?", (id,)).fetchone()
    conn.close()
    if not res:
        raise HTTPException(status_code=404, detail="Integration not found")
    return dict(res)

# ----------------- TEMPLATES -----------------
@app.get("/api/templates")
def list_templates():
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM templates ORDER BY created_at DESC").fetchall()
    conn.close()
    res = []
    for r in rows:
        d = dict(r)
        d["variables"] = json.loads(d["variables_json"]) if d["variables_json"] else []
        res.append(d)
    return res

@app.post("/api/templates")
def create_template(payload: TemplateCreate):
    conn = get_db_connection()
    now = datetime.utcnow().isoformat()
    tmpl_id = f"tmpl_{uuid.uuid4().hex[:10]}"
    vars_list = extract_template_variables(payload.body + " " + (payload.subject or ""))
    conn.execute("""
    INSERT INTO templates (id, name, channel, subject, body, category, variables_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (tmpl_id, payload.name, payload.channel, payload.subject, payload.body, payload.category, json.dumps(vars_list), now, now))
    conn.commit()
    conn.close()
    return {"id": tmpl_id, "message": "Template created successfully"}

@app.delete("/api/templates/{id}")
def delete_template(id: str):
    conn = get_db_connection()
    conn.execute("DELETE FROM templates WHERE id = ?", (id,))
    conn.commit()
    conn.close()
    return {"message": "Template deleted"}

# ----------------- FILE & DATASET PARSING -----------------
@app.post("/api/campaigns/parse-file")
async def parse_spreadsheet_file(file: UploadFile = File(...)):
    filename = file.filename or "recipients.csv"
    content = await file.read()
    
    if filename.lower().endswith(".xlsx") or filename.lower().endswith(".xls"):
        headers, rows = parse_xlsx_content(content)
    else:
        headers, rows = parse_csv_content(content)

    if not headers or not rows:
        raise HTTPException(status_code=400, detail="The uploaded spreadsheet appears empty or corrupt.")

    inferred_mapping = infer_column_mappings(headers, rows)

    return {
        "filename": filename,
        "headers": headers,
        "row_count": len(rows),
        "inferred_mapping": inferred_mapping,
        "sample_rows": rows[:10],
        "all_rows": rows
    }

@app.get("/api/campaigns/demo-dataset")
def get_demo_dataset():
    """Returns the pre-bundled demo contacts for instant testing."""
    sample_csv_path = os.path.join(os.path.dirname(__file__), "sample_data", "demo_recipients.csv")
    if not os.path.exists(sample_csv_path):
        raise HTTPException(status_code=404, detail="Demo file not found")
    with open(sample_csv_path, "rb") as f:
        content = f.read()
    headers, rows = parse_csv_content(content)
    inferred_mapping = infer_column_mappings(headers, rows)
    return {
        "filename": "demo_recipients.csv",
        "headers": headers,
        "row_count": len(rows),
        "inferred_mapping": inferred_mapping,
        "sample_rows": rows[:10],
        "all_rows": rows
    }

# ----------------- PRE-FLIGHT VALIDATION -----------------
@app.post("/api/campaigns/validate", response_model=ValidationReport)
def validate_campaign_recipients(payload: Dict[str, Any]):
    channel = payload.get("channel", "gmail")
    raw_rows = payload.get("raw_data", [])
    column_mapping = payload.get("column_mapping", {})
    template_body = payload.get("template_body", "")
    template_subject = payload.get("template_subject", "")

    if not raw_rows:
        raise HTTPException(status_code=400, detail="No rows provided for validation")

    report = validate_and_normalize_recipients(
        channel=channel,
        raw_rows=raw_rows,
        column_mapping=column_mapping,
        template_body=template_body,
        template_subject=template_subject
    )
    return report

# ----------------- CAMPAIGNS -----------------
@app.get("/api/campaigns")
def list_campaigns():
    conn = get_db_connection()
    campaigns = conn.execute("SELECT * FROM campaigns ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(c) for c in campaigns]

@app.post("/api/campaigns")
async def create_and_launch_campaign(payload: CampaignCreate):
    conn = get_db_connection()
    try:
        now = datetime.utcnow().isoformat()
        campaign_id = f"cmp_{uuid.uuid4().hex[:10]}"

        # Run validation on rows
        report = validate_and_normalize_recipients(
            channel=payload.channel,
            raw_rows=payload.raw_data,
            column_mapping=payload.column_mapping,
            template_body=payload.template_body,
            template_subject=payload.subject or ""
        )

        # Insert campaign record
        conn.execute("""
        INSERT INTO campaigns (
            id, name, channel, status, sender_identity, subject, template_body, source_filename,
            total_recipients, valid_count, invalid_count, duplicate_count, queued_count, throttle_delay_sec, created_at
        )
        VALUES (?, ?, ?, 'QUEUED', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            campaign_id, payload.name, payload.channel, payload.sender_identity, payload.subject,
            payload.template_body, payload.source_filename, report.total_rows, report.valid_count,
            report.invalid_count, report.duplicate_count, report.valid_count, payload.throttle_delay_sec or 0.8, now
        ))

        # Insert recipients and prepare messages for valid rows
        for row_diag in report.sample_rows:
            rec_id = f"rec_{uuid.uuid4().hex[:10]}"
            row_vars = row_diag.variables
            name_val = row_diag.name or row_vars.get("name") or row_vars.get("Full Name")
            email_val = row_diag.identifier if payload.channel == "gmail" else row_vars.get("email") or row_vars.get("Email Address")
            phone_val = row_diag.identifier if payload.channel == "whatsapp" else row_vars.get("phone") or row_vars.get("Phone Number")

            conn.execute("""
            INSERT INTO recipients (
                id, campaign_id, row_number, name, email, phone, variables_json, validation_status, validation_error, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                rec_id, campaign_id, row_diag.row_number, name_val, email_val, phone_val,
                json.dumps(row_vars), row_diag.status, row_diag.error, now
            ))

            # Only queue valid recipients for outbound delivery
            if row_diag.status == "VALID" and row_diag.identifier:
                # Perform variable rendering
                rendered_body = payload.template_body
                rendered_subject = payload.subject or ""
                for k, v in row_vars.items():
                    pattern = re.compile(rf"\{{\{{\s*{re.escape(k)}\s*\}}\}}", re.IGNORECASE)
                    rendered_body = pattern.sub(str(v), rendered_body)
                    rendered_subject = pattern.sub(str(v), rendered_subject)

                # Also replace standardized {{name}} if available
                if name_val:
                    rendered_body = re.sub(r"\{\{\s*name\s*\}\}", name_val, rendered_body, flags=re.IGNORECASE)
                    rendered_subject = re.sub(r"\{\{\s*name\s*\}\}", name_val, rendered_subject, flags=re.IGNORECASE)

                msg_id = f"msg_{uuid.uuid4().hex[:10]}"
                conn.execute("""
                INSERT INTO messages (
                    id, campaign_id, recipient_id, channel, recipient_identifier, rendered_subject,
                    rendered_body, status, attempt_count, queued_at, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, 'QUEUED', 0, ?, ?, ?)
                """, (
                    msg_id, campaign_id, rec_id, payload.channel, row_diag.identifier,
                    rendered_subject if payload.channel == "gmail" else None,
                    rendered_body, now, now, now
                ))

        # Audit log
        conn.execute("""
        INSERT INTO audit_logs (id, action, entity_type, entity_id, details, created_at)
        VALUES (?, 'CREATE_CAMPAIGN', 'campaign', ?, ?, ?)
        """, (f"aud_{uuid.uuid4().hex[:8]}", campaign_id, json.dumps({"name": payload.name, "valid": report.valid_count}), now))

        conn.commit()
    finally:
        conn.close()

    # Automatically trigger async queue execution
    queue_engine.start_campaign(campaign_id)

    return {"id": campaign_id, "status": "QUEUED", "valid_count": report.valid_count, "total_count": report.total_rows}

@app.get("/api/campaigns/{id}")
def get_campaign_detail(id: str):
    conn = get_db_connection()
    c = conn.execute("SELECT * FROM campaigns WHERE id = ?", (id,)).fetchone()
    if not c:
        conn.close()
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Recalculate live status counts
    status_counts = conn.execute("""
    SELECT status, COUNT(*) as cnt FROM messages WHERE campaign_id = ? GROUP BY status
    """, (id,)).fetchall()
    
    conn.close()
    cdict = dict(c)
    cdict["breakdown"] = {row["status"]: row["cnt"] for row in status_counts}
    return cdict

@app.get("/api/campaigns/{id}/messages")
def get_campaign_messages(
    id: str,
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(100),
    offset: int = Query(0)
):
    conn = get_db_connection()
    query = """
    SELECT m.*, r.name as recipient_name, r.row_number, r.variables_json
    FROM messages m
    JOIN recipients r ON m.recipient_id = r.id
    WHERE m.campaign_id = ?
    """
    params = [id]
    if status and status != "ALL":
        query += " AND m.status = ?"
        params.append(status)
    if search:
        query += " AND (m.recipient_identifier LIKE ? OR r.name LIKE ? OR m.provider_message_id LIKE ?)"
        s = f"%{search}%"
        params.extend([s, s, s])
    
    query += " ORDER BY r.row_number ASC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    rows = conn.execute(query, params).fetchall()
    
    total = conn.execute("SELECT COUNT(*) FROM messages WHERE campaign_id = ?", (id,)).fetchone()[0]
    conn.close()

    res = []
    for r in rows:
        d = dict(r)
        d["variables"] = json.loads(d["variables_json"]) if d["variables_json"] else {}
        res.append(d)

    return {"total": total, "messages": res}

# ----------------- CAMPAIGN CONTROLS -----------------
@app.post("/api/campaigns/{id}/pause")
async def pause_campaign(id: str):
    queue_engine.pause_campaign(id)
    return {"id": id, "status": "PAUSED"}

@app.post("/api/campaigns/{id}/resume")
async def resume_campaign(id: str):
    queue_engine.resume_campaign(id)
    return {"id": id, "status": "RUNNING"}

@app.post("/api/campaigns/{id}/cancel")
async def cancel_campaign(id: str):
    queue_engine.cancel_campaign(id)
    return {"id": id, "status": "CANCELLED"}

@app.post("/api/campaigns/{id}/retry-failed")
async def retry_failed_campaign(id: str):
    await queue_engine.retry_failed(id)
    return {"id": id, "status": "RUNNING", "message": "Failed messages re-queued"}

# ----------------- REAL-TIME SSE STREAM -----------------
@app.get("/api/campaigns/{id}/stream")
async def campaign_sse_stream(id: str):
    """
    Sub-second live streaming connection for campaign progress,
    sending state transitions directly to the browser UI without polling.
    """
    q = queue_engine.subscribe(id)

    async def event_generator():
        try:
            # Yield initial snapshot
            conn = get_db_connection()
            c = conn.execute("SELECT * FROM campaigns WHERE id = ?", (id,)).fetchone()
            conn.close()
            if c:
                yield f"data: {json.dumps({'event': 'INITIAL_STATE', 'data': dict(c)})}\n\n"

            while True:
                payload = await q.get()
                yield f"data: {payload}\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            queue_engine.unsubscribe(id, q)

    return StreamingResponse(event_generator(), media_type="text/event-stream")

# ----------------- EXPORT REPORT -----------------
@app.get("/api/campaigns/{id}/export")
def export_campaign_report(id: str):
    conn = get_db_connection()
    c = conn.execute("SELECT * FROM campaigns WHERE id = ?", (id,)).fetchone()
    if not c:
        conn.close()
        raise HTTPException(status_code=404, detail="Campaign not found")

    messages = conn.execute("""
    SELECT r.row_number, r.name, m.channel, m.recipient_identifier, m.status,
           m.provider_message_id, m.sent_at, m.delivered_at, m.read_at, m.failed_at,
           m.last_error_code, m.last_error_message
    FROM messages m
    JOIN recipients r ON m.recipient_id = r.id
    WHERE m.campaign_id = ?
    ORDER BY r.row_number ASC
    """, (id,)).fetchall()
    conn.close()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Row", "Recipient Name", "Channel", "Identifier", "Status",
        "Provider Message ID", "Sent At", "Delivered At", "Read At", "Failed At",
        "Error Code", "Error Message"
    ])
    for m in messages:
        writer.writerow([
            m["row_number"], m["name"], m["channel"], m["recipient_identifier"], m["status"],
            m["provider_message_id"], m["sent_at"], m["delivered_at"], m["read_at"], m["failed_at"],
            m["last_error_code"], m["last_error_message"]
        ])

    csv_data = output.getvalue()
    filename = f"automessage_export_{c['name'].replace(' ', '_').lower()}_{id}.csv"
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# ----------------- AI COPILOT -----------------
@app.post("/api/ai/draft", response_model=AIDraftResponse)
def ai_draft_message(req: AIDraftRequest):
    return generate_ai_draft(req)

# ----------------- WHATSAPP WEBHOOKS -----------------
@app.get("/api/webhooks/whatsapp")
def verify_whatsapp_webhook(
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_challenge: str = Query(None, alias="hub.challenge"),
    hub_verify_token: str = Query(None, alias="hub.verify_token")
):
    """Meta webhook verification endpoint"""
    if hub_mode == "subscribe" and hub_verify_token == "automessage_webhook_secret_tok_2026":
        return PlainTextResponse(content=hub_challenge or "")
    return PlainTextResponse(content="Verification failed", status_code=403)

@app.post("/api/webhooks/whatsapp")
async def receive_whatsapp_webhook(event: WebhookWhatsAppEvent):
    """Official or simulated webhook processor"""
    conn = get_db_connection()
    msg = conn.execute("SELECT * FROM messages WHERE provider_message_id = ?", (event.provider_message_id,)).fetchone()
    if not msg:
        conn.close()
        return {"status": "ignored", "reason": "Message not found"}

    now = datetime.utcnow().isoformat()
    new_status = event.event_type.upper()
    time_col = "delivered_at" if new_status == "DELIVERED" else "read_at" if new_status == "READ" else "failed_at"

    conn.execute(f"""
    UPDATE messages 
    SET status = ?, {time_col} = ?, updated_at = ?
    WHERE id = ?
    """, (new_status, now, now, msg["id"]))
    
    conn.execute("""
    INSERT INTO message_events (id, message_id, campaign_id, provider, event_type, provider_event_id, payload_json, created_at)
    VALUES (?, ?, ?, 'whatsapp', ?, ?, ?, ?)
    """, (f"evt_{uuid.uuid4().hex[:8]}", msg["id"], msg["campaign_id"], new_status, event.provider_message_id, json.dumps(event.dict()), now))

    # Recalculate
    queue_engine._recalculate_campaign_counts(conn, msg["campaign_id"])
    conn.commit()
    conn.close()

    await queue_engine.broadcast_event(msg["campaign_id"], "MESSAGE_STATUS", {
        "message_id": msg["id"],
        "status": new_status,
        "provider_message_id": event.provider_message_id
    })

    return {"status": "success", "message_id": msg["id"], "updated_to": new_status}

# ----------------- WHATSAPP QR CODE BRIDGE PROXY -----------------
import httpx
WHATSAPP_BRIDGE_URL = os.getenv("WHATSAPP_BRIDGE_URL", "http://127.0.0.1:3001").rstrip('/')

@app.get("/api/whatsapp-bridge/status")
async def get_whatsapp_bridge_status():
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{WHATSAPP_BRIDGE_URL}/status", timeout=5.0)
            data = resp.json()
            if data.get("status") == "CONNECTED" and data.get("user"):
                conn = get_db_connection()
                try:
                    conn.execute("""
                    UPDATE integrations 
                    SET account_identifier = ?, is_connected = 1, is_simulated = 0, phone_number_id = 'baileys_session', updated_at = ?
                    WHERE provider = 'whatsapp'
                    """, (f"+{data['user']['id']}", datetime.utcnow().isoformat()))
                    conn.commit()
                finally:
                    conn.close()
            return data
    except Exception as e:
        return {"status": "OFFLINE", "error": str(e), "qr": None, "user": None}

@app.post("/api/whatsapp-bridge/refresh-qr")
@app.post("/api/whatsapp-bridge/reset")
async def refresh_whatsapp_bridge_qr():
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(f"{WHATSAPP_BRIDGE_URL}/refresh-qr", timeout=10.0)
            data = resp.json()
            conn = get_db_connection()
            try:
                conn.execute("""
                UPDATE integrations 
                SET is_connected = 0, phone_number_id = 'baileys_session', updated_at = ?
                WHERE provider = 'whatsapp'
                """, (datetime.utcnow().isoformat(),))
                conn.commit()
            finally:
                conn.close()
            return data
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/api/whatsapp-bridge/logout")
async def logout_whatsapp_bridge():
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(f"{WHATSAPP_BRIDGE_URL}/logout", timeout=8.0)
            conn = get_db_connection()
            try:
                conn.execute("""
                UPDATE integrations 
                SET is_connected = 0, updated_at = ?
                WHERE provider = 'whatsapp'
                """, (datetime.utcnow().isoformat(),))
                conn.commit()
            finally:
                conn.close()
            return resp.json()
    except Exception as e:
        return {"success": False, "error": str(e)}

# ----------------- STATIC FRONTEND SPA SERVING -----------------
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

frontend_dist = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")
if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        if full_path.startswith("api"):
            raise HTTPException(status_code=404, detail="API endpoint not found")
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
