import sqlite3
import json
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "automessage.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA busy_timeout = 30000;")
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. integrations table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS integrations (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL, -- 'gmail' or 'whatsapp'
        account_identifier TEXT NOT NULL,
        is_connected INTEGER DEFAULT 1,
        is_simulated INTEGER DEFAULT 1,
        access_token_encrypted TEXT,
        refresh_token_encrypted TEXT,
        phone_number_id TEXT,
        waba_id TEXT,
        webhook_verify_token TEXT,
        last_verified_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    """)

    # 2. templates table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        channel TEXT NOT NULL, -- 'gmail' or 'whatsapp'
        subject TEXT,
        body TEXT NOT NULL,
        category TEXT DEFAULT 'general',
        variables_json TEXT, -- array of detected variables e.g. ["name", "event_name"]
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    """)

    # 3. campaigns table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS campaigns (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        channel TEXT NOT NULL, -- 'gmail' or 'whatsapp'
        status TEXT NOT NULL, -- 'DRAFT', 'QUEUED', 'RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED'
        sender_identity TEXT,
        subject TEXT,
        template_body TEXT NOT NULL,
        source_filename TEXT,
        total_recipients INTEGER DEFAULT 0,
        valid_count INTEGER DEFAULT 0,
        invalid_count INTEGER DEFAULT 0,
        duplicate_count INTEGER DEFAULT 0,
        queued_count INTEGER DEFAULT 0,
        processing_count INTEGER DEFAULT 0,
        sent_count INTEGER DEFAULT 0,
        delivered_count INTEGER DEFAULT 0,
        read_count INTEGER DEFAULT 0,
        failed_count INTEGER DEFAULT 0,
        throttle_delay_sec REAL DEFAULT 0.8,
        created_at TEXT NOT NULL,
        started_at TEXT,
        completed_at TEXT
    );
    """)

    # 4. recipients table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS recipients (
        id TEXT PRIMARY KEY,
        campaign_id TEXT NOT NULL,
        row_number INTEGER NOT NULL,
        name TEXT,
        email TEXT,
        phone TEXT,
        variables_json TEXT,
        validation_status TEXT NOT NULL, -- 'VALID', 'INVALID', 'DUPLICATE'
        validation_error TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (campaign_id) REFERENCES campaigns (id) ON DELETE CASCADE
    );
    """)

    # 5. messages table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        campaign_id TEXT NOT NULL,
        recipient_id TEXT NOT NULL,
        channel TEXT NOT NULL,
        recipient_identifier TEXT NOT NULL,
        rendered_subject TEXT,
        rendered_body TEXT NOT NULL,
        status TEXT NOT NULL, -- 'QUEUED', 'PROCESSING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'CANCELLED'
        provider_message_id TEXT,
        attempt_count INTEGER DEFAULT 0,
        last_error_code TEXT,
        last_error_message TEXT,
        queued_at TEXT,
        sent_at TEXT,
        delivered_at TEXT,
        read_at TEXT,
        failed_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (campaign_id) REFERENCES campaigns (id) ON DELETE CASCADE,
        FOREIGN KEY (recipient_id) REFERENCES recipients (id) ON DELETE CASCADE
    );
    """)

    # 6. message_events table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS message_events (
        id TEXT PRIMARY KEY,
        message_id TEXT NOT NULL,
        campaign_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        event_type TEXT NOT NULL, -- 'QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED'
        provider_event_id TEXT,
        payload_json TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (message_id) REFERENCES messages (id) ON DELETE CASCADE
    );
    """)

    # 7. audit_logs table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        details TEXT,
        created_at TEXT NOT NULL
    );
    """)

    # Seed default integrations if not present
    cursor.execute("SELECT COUNT(*) FROM integrations")
    if cursor.fetchone()[0] == 0:
        now = datetime.utcnow().isoformat()
        cursor.execute("""
        INSERT INTO integrations (id, provider, account_identifier, is_connected, is_simulated, phone_number_id, waba_id, webhook_verify_token, last_verified_at, created_at, updated_at)
        VALUES 
        ('int_gmail_default', 'gmail', 'Not configured', 0, 0, NULL, NULL, NULL, ?, ?, ?),
        ('int_wa_default', 'whatsapp', 'Not connected', 0, 0, 'baileys_session', NULL, NULL, ?, ?, ?)
        """, (now, now, now, now, now, now))

    # Seed starter templates if not present
    cursor.execute("SELECT COUNT(*) FROM templates")
    if cursor.fetchone()[0] == 0:
        now = datetime.utcnow().isoformat()
        starter_templates = [
            (
                'tmpl_workshop_wa',
                'Workshop Confirmation & Pass',
                'whatsapp',
                None,
                "👋 Hi {{name}}!\n\nYour registration for *{{event_name}}* is confirmed for *{{event_date}}*.\n\n📍 Location: *{{venue}}*\n🎟 Pass ID: #{{ticket_id}}\n\nPlease present this message at check-in.\n\nBest,\n*{{sender_name}}*",
                'events',
                json.dumps(['name', 'event_name', 'event_date', 'venue', 'ticket_id', 'sender_name']),
                now, now
            ),
            (
                'tmpl_invoice_email',
                'Payment Reminder Notice',
                'gmail',
                'Invoice Reminder: {{invoice_num}} due for {{company}}',
                "<p>Dear {{name}},</p><p>This is a gentle reminder that invoice <strong>#{{invoice_num}}</strong> for <strong>{{company}}</strong> in the amount of <strong>${{amount}}</strong> is due on <strong>{{due_date}}</strong>.</p><p>Please let us know once transferred.</p><p>Warm regards,<br>{{sender_name}}</p>",
                'finance',
                json.dumps(['name', 'invoice_num', 'company', 'amount', 'due_date', 'sender_name']),
                now, now
            ),
            (
                'tmpl_interview_email',
                'Interview Schedule Invitation',
                'gmail',
                'Invitation to Interview at {{company}} - {{role}}',
                "<p>Hello {{name}},</p><p>Thank you for applying for the <strong>{{role}}</strong> position at <strong>{{company}}</strong>. We were impressed with your profile and would love to schedule a 30-minute introductory conversation on <strong>{{interview_date}}</strong> at <strong>{{time}}</strong>.</p><p>Looking forward to speaking with you!</p><p>Best regards,<br>{{sender_name}}<br>Talent Acquisition Team</p>",
                'recruiting',
                json.dumps(['name', 'role', 'company', 'interview_date', 'time', 'sender_name']),
                now, now
            ),
            (
                'tmpl_announcement_wa',
                'VIP Product Launch Alert',
                'whatsapp',
                None,
                "🚀 *Big News {{name}}!*\n\nOur brand new *{{product_name}}* has officially gone live. As an early supporter from *{{company}}*, use code *{{promo_code}}* for an exclusive {{discount_pct}}% off.\n\n👉 Check it out here: {{link}}\n\nCheers,\n{{sender_name}}",
                'marketing',
                json.dumps(['name', 'product_name', 'company', 'promo_code', 'discount_pct', 'link', 'sender_name']),
                now, now
            )
        ]
        cursor.executemany("""
        INSERT INTO templates (id, name, channel, subject, body, category, variables_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, starter_templates)

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully.")
