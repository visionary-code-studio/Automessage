import os
import re
from typing import Dict, Any, List
from ..models import AIDraftRequest, AIDraftResponse

def generate_ai_draft(req: AIDraftRequest) -> AIDraftResponse:
    """
    Generates message drafts, subjects, and suggested variables.
    Supports optional Gemini API when GEMINI_API_KEY is configured,
    and provides a high-quality built-in template synthesizer out-of-the-box.
    """
    gemini_key = os.environ.get("GEMINI_API_KEY")
    if gemini_key:
        try:
            import google.generativeai as genai
            genai.configure(api_key=gemini_key)
            model = genai.GenerativeModel("gemini-1.5-flash")
            prompt = f"""
            You are AutoMessage AI Copywriter. Generate a bulk outreach message for channel: {req.channel}.
            Goal: {req.goal}
            Tone: {req.tone}
            Target Audience: {req.audience}
            Extra details: {req.key_details or 'None'}

            Output format:
            Subject: [Only if channel is gmail, else None]
            Variables: comma separated variable names in double curly braces (e.g. name, company, event_date)
            Body: The message content with variables in {{variable_name}} syntax.
            For WhatsApp: use WhatsApp markdown like *bold*, _italics_, and tasteful emojis.
            For Gmail: write formatted HTML or clean paragraphs.
            """
            res = model.generate_content(prompt)
            text = res.text
            # Parse text
            subject_match = re.search(r"Subject:\s*(.*)", text)
            subj = subject_match.group(1).strip() if (subject_match and req.channel == "gmail") else None
            return AIDraftResponse(
                subject=subj,
                body=text,
                suggested_variables=["name", "company", "event_date"],
                whatsapp_format=text if req.channel == "whatsapp" else None
            )
        except Exception:
            pass # fallback to built-in synthesizer

    # Built-in Intelligent Synthesizer
    tone = (req.tone or "professional").lower()
    goal = req.goal.lower()
    
    if req.channel == "whatsapp":
        if "workshop" in goal or "event" in goal or "webinar" in goal:
            subject = None
            body = (
                "👋 *Hi {{name}}!*\n\n"
                "This is a quick confirmation for *{{event_name}}* scheduled for *{{event_date}}*.\n\n"
                "📍 *Venue / Link:* {{event_location}}\n"
                "🎟 *Access Pass:* #{{ticket_id}}\n\n"
                "Please arrive 10 minutes early. Let us know if you have any questions!\n\n"
                "Best regards,\n*{{sender_name}}*"
            )
            vars_list = ["name", "event_name", "event_date", "event_location", "ticket_id", "sender_name"]
        elif "invoice" in goal or "payment" in goal:
            subject = None
            body = (
                "💳 *Payment Notice for {{name}}*\n\n"
                "Invoice *#{{invoice_num}}* for *{{company}}* in the amount of *${{amount}}* is pending for *{{due_date}}*.\n\n"
                "🔗 *Pay securely here:* {{payment_link}}\n\n"
                "Thank you for your business!\n*{{sender_name}}*"
            )
            vars_list = ["name", "invoice_num", "company", "amount", "due_date", "payment_link", "sender_name"]
        else:
            subject = None
            body = (
                "✨ *Hello {{name}}!*\n\n"
                f"We wanted to reach out regarding *{{subject_matter}}* for *{{company}}*.\n\n"
                "We would love to share a quick update and discuss next steps whenever you are free.\n\n"
                "Warm regards,\n*{{sender_name}}*"
            )
            vars_list = ["name", "subject_matter", "company", "sender_name"]

    else: # Gmail
        if "workshop" in goal or "event" in goal:
            subject = "Confirmation: Your Registration for {{event_name}} on {{event_date}}"
            body = (
                "<p>Dear {{name}},</p>"
                "<p>Thank you for registering for <strong>{{event_name}}</strong>. We are thrilled to have you join us on <strong>{{event_date}}</strong>.</p>"
                "<div style='background: #f4f4f5; padding: 16px; border-radius: 8px; margin: 16px 0;'>"
                "<p style='margin: 0;'><strong>Date & Time:</strong> {{event_date}} at {{event_time}}</p>"
                "<p style='margin: 8px 0 0 0;'><strong>Location / Link:</strong> {{event_location}}</p>"
                "<p style='margin: 8px 0 0 0;'><strong>Registration ID:</strong> #{{ticket_id}}</p>"
                "</div>"
                "<p>If you have any questions prior to the event, simply reply to this email.</p>"
                "<p>Warm regards,<br><strong>{{sender_name}}</strong><br>Events Team</p>"
            )
            vars_list = ["name", "event_name", "event_date", "event_time", "event_location", "ticket_id", "sender_name"]
        elif "invoice" in goal or "payment" in goal:
            subject = "Invoice Reminder: #{{invoice_num}} for {{company}}"
            body = (
                "<p>Hello {{name}},</p>"
                "<p>This is a polite reminder that invoice <strong>#{{invoice_num}}</strong> issued to <strong>{{company}}</strong> for <strong>${{amount}}</strong> is due on <strong>{{due_date}}</strong>.</p>"
                "<p>You can view and settle your invoice directly via our portal: <a href='{{payment_link}}'>View Invoice</a>.</p>"
                "<p>Please let us know once payment has been initiated.</p>"
                "<p>Sincerely,<br><strong>{{sender_name}}</strong><br>Finance Operations</p>"
            )
            vars_list = ["name", "invoice_num", "company", "amount", "due_date", "payment_link", "sender_name"]
        elif "interview" in goal or "hire" in goal or "candidate" in goal:
            subject = "Invitation to Interview: {{role}} at {{company}}"
            body = (
                "<p>Dear {{name}},</p>"
                "<p>Thank you for your interest in the <strong>{{role}}</strong> position at <strong>{{company}}</strong>. We were very impressed with your background and achievements.</p>"
                "<p>We would love to invite you for an introductory conversation on <strong>{{interview_date}}</strong> at <strong>{{interview_time}}</strong>.</p>"
                "<p>Please let us know if this slot works well for your schedule.</p>"
                "<p>Best regards,<br><strong>{{sender_name}}</strong><br>Talent Acquisition</p>"
            )
            vars_list = ["name", "role", "company", "interview_date", "interview_time", "sender_name"]
        else:
            subject = "Exciting Update for {{company}} from {{sender_name}}"
            body = (
                "<p>Hi {{name}},</p>"
                f"<p>I hope this email finds you well. I am reaching out to share some exciting developments regarding <strong>{{topic}}</strong> at <strong>{{company}}</strong>.</p>"
                "<p>We have recently launched several updates designed to streamline operations and deliver measurable results.</p>"
                "<p>Would you be open to a brief 10-minute catchup this week?</p>"
                "<p>Best regards,<br><strong>{{sender_name}}</strong></p>"
            )
            vars_list = ["name", "company", "topic", "sender_name"]

    return AIDraftResponse(
        subject=subject,
        body=body,
        suggested_variables=vars_list,
        whatsapp_format=body if req.channel == "whatsapp" else None
    )
