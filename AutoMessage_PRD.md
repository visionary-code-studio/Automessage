# AutoMessage — Product Requirements Document (PRD)

**Product Name:** AutoMessage  
**Product Type:** Multi-channel bulk messaging automation platform  
**Primary Channels:** Gmail + WhatsApp Business Platform  
**Status:** Product Blueprint / MVP PRD  
**Version:** 1.0  
**Target Users:** Students, freelancers, startups, small businesses, recruiters, sales/support teams, event organizers, institutions, and operations teams

---

## 1. Product Overview

AutoMessage is a web-based communication automation platform that allows a user to prepare one reusable message, upload or connect a recipient spreadsheet, validate recipient identifiers, personalize the message using spreadsheet fields, send messages sequentially through supported channels, and track the status of each recipient from a centralized checklist/dashboard.

The initial supported channels are:

1. **Gmail** — send personalized emails through the user's authorized Gmail account.
2. **WhatsApp** — send business messages through the official WhatsApp Business Platform / Cloud API.

The core workflow is:

> **Create Message → Upload Recipient Sheet → Map Columns → Validate Recipients → Preview → Start Campaign → Queue & Send → Receive Status Updates → Track Results**

AutoMessage is not intended to emulate WhatsApp Web, automate personal WhatsApp clients, or bypass provider policies. WhatsApp automation should use an authorized WhatsApp Business Platform integration and comply with Meta's Business Messaging policies. citeturn924943search5turn982761search0

---

## 2. Problem Statement

Users who need to contact many recipients often maintain recipient information in spreadsheets and manually copy/paste messages into Gmail or WhatsApp. This creates several operational problems:

- Repetitive manual work.
- Copy/paste errors in recipient addresses or phone numbers.
- Difficulty personalizing messages at scale.
- No single campaign-level view of progress.
- Poor visibility into failures and retries.
- Difficult reconciliation between the spreadsheet and the actual communication status.
- No unified workflow for email and WhatsApp campaigns.

AutoMessage solves this by treating a spreadsheet as a structured recipient source and a message as a reusable template executed through channel-specific delivery adapters.

---

## 3. Product Vision

**"One message. One recipient sheet. Every delivery tracked."**

AutoMessage should become a lightweight communication operating layer for small and medium-scale outbound communication where the sender already has a legitimate recipient relationship and an authorized sending account.

---

## 4. Goals

### 4.1 Primary Goals

- Let users create or import message templates.
- Support recipient data from CSV/XLSX and optionally Google Sheets.
- Automatically identify and validate email addresses for Gmail campaigns.
- Automatically identify and normalize phone numbers for WhatsApp campaigns.
- Map spreadsheet columns to message variables such as `{{name}}`, `{{company}}`, or `{{amount}}`.
- Allow previewing a personalized message before sending.
- Send messages one by one using a durable background queue.
- Track per-recipient campaign state.
- Provide retry and failure handling.
- Provide campaign analytics.
- Keep channel integrations modular so more providers can be added later.

### 4.2 Secondary Goals

- AI-assisted message drafting and rewriting.
- Duplicate recipient detection.
- Smart validation and normalization.
- Campaign scheduling.
- Saved templates.
- Role-based team access.

---

## 5. Non-Goals for MVP

The MVP will **not**:

- Scrape WhatsApp Web or automate a personal WhatsApp account through browser automation.
- Attempt to bypass WhatsApp messaging restrictions, spam protections, rate limits, or account restrictions.
- Promise delivery/read confirmation for Gmail where the provider does not expose reliable recipient-level confirmation.
- Implement a full CRM.
- Implement advanced email marketing automation such as multi-step drip sequences.
- Provide unrestricted anonymous bulk messaging.

---

## 6. Target Personas

### Persona A — Freelancer / Student

Needs to send personalized project, internship, event, or outreach emails to a controlled list.

### Persona B — Small Business Owner

Needs to send updates, confirmations, announcements, or service messages through approved communication channels.

### Persona C — Operations / Event Coordinator

Needs to send the same event-related information to a large list and verify who has been processed.

### Persona D — Startup / Sales Team

Needs repeatable outbound workflows, recipient personalization, campaign analytics, and auditability.

---

## 7. Core User Journey

### Step 1 — Sign In

User signs in with AutoMessage authentication.

### Step 2 — Connect Channel

User connects Gmail through OAuth 2.0 and/or configures an authorized WhatsApp Business account.

### Step 3 — Create Campaign

User selects:

- Campaign name.
- Channel: Gmail or WhatsApp.
- Sender account/phone number.
- Template or new message.

### Step 4 — Create Message

User can:

- Write from scratch.
- Select a saved template.
- Use AI assistance to draft/rewrite the message.
- Insert variables from spreadsheet columns.

Example:

```text
Hello {{name}},

We are pleased to invite you to {{event_name}} on {{event_date}}.

Regards,
{{sender_name}}
```

### Step 5 — Upload Recipient Spreadsheet

Supported MVP formats:

- `.csv`
- `.xlsx`

Optional later support:

- Google Sheets URL / connected Google Sheet.

### Step 6 — Column Mapping

AutoMessage detects likely recipient columns.

Example:

| Spreadsheet Column | System Field |
|---|---|
| Name | `name` |
| Email | `email` |
| Mobile | `phone` |
| Company | `company` |
| Event | `event_name` |

The user can override the automatic mapping.

### Step 7 — Validation

System validates:

- Required recipient field exists.
- Email syntax for Gmail.
- Phone number normalization for WhatsApp.
- Duplicate recipients.
- Missing required template variables.
- Empty rows.
- Invalid spreadsheet structure.
- Unsupported values.

The UI should produce a validation report before sending.

### Step 8 — Personalized Preview

User can select any recipient row and preview exactly what will be sent.

### Step 9 — Campaign Confirmation

Before starting, show:

- Total rows.
- Valid recipients.
- Invalid recipients.
- Duplicate recipients.
- Messages to be sent.
- Sender identity.
- Channel.
- Estimated campaign size.
- Policy/compliance confirmation.

### Step 10 — Send Queue

Messages enter a background job queue.

Messages are processed sequentially or at a provider-safe controlled concurrency level.

Each message receives a unique internal message/job identifier and a provider message identifier when available.

### Step 11 — Tracking

The campaign dashboard provides a checklist-like status table:

| Recipient | Channel ID | Status | Timestamp | Action |
|---|---|---|---|---|
| A | email/phone | Queued | — | View |
| B | email/phone | Sent | 20:11 | View |
| C | email/phone | Delivered | 20:12 | View |
| D | email/phone | Failed | 20:13 | Retry |

WhatsApp can provide webhook-driven statuses such as `sent`, `delivered`, `read`, and `failed`. citeturn982761search0turn982761search1

For Gmail, the application should distinguish **send accepted / API send successful** from **recipient delivery confirmed**. Gmail's API supports programmatic sending and returns a message resource; it should not be represented in the UI as a guaranteed recipient-level delivery receipt. citeturn924943search0turn924943search1

---

## 8. Functional Requirements

### FR-01 — Authentication

- User can register/login.
- User can log out.
- User can reset credentials.
- Optional Google Sign-In.
- Session must expire securely.

### FR-02 — Gmail Connection

- Connect Gmail via OAuth 2.0.
- Request minimum required scopes.
- Display connected Gmail address.
- Allow disconnect/reconnect.
- Store refresh tokens securely.
- Never expose access tokens to the browser.

Gmail API supports programmatic message sending through `messages.send` or sending an existing Gmail draft through `drafts.send`. citeturn924943search0

### FR-03 — WhatsApp Connection

- Configure WhatsApp Business account credentials.
- Store encrypted credentials/secrets.
- Configure sender phone number / phone number ID.
- Configure webhook endpoint.
- Verify webhook events.
- Receive status updates.
- Support approved message templates where required by WhatsApp's current messaging rules.

WhatsApp Business Platform policies apply to API-based business messaging. citeturn924943search5

### FR-04 — Campaign Creation

Fields:

- Campaign name.
- Channel.
- Message/template.
- Recipient source.
- Optional schedule.
- Optional sender identity.

### FR-05 — Spreadsheet Import

Input validation:

- File type.
- File size.
- Header presence.
- Row count.
- Encoding.
- Duplicate rows.
- Required field detection.

### FR-06 — Recipient Intelligence

System must identify likely recipient fields.

Examples:

- `email`, `e-mail`, `email_address` → email.
- `mobile`, `phone`, `phone_number`, `whatsapp` → phone.
- `name`, `full_name` → name.

The user must confirm the final mapping before campaign execution.

### FR-07 — Message Personalization

Support variables:

```text
{{name}}
{{email}}
{{phone}}
{{company}}
{{event_name}}
{{event_date}}
```

If a variable is missing for a recipient, the system must flag the row instead of silently sending malformed content.

### FR-08 — AI Message Assistant

Optional MVP+ module:

User provides an instruction such as:

> "Write a professional reminder for students who registered for our workshop."

AI returns:

- Subject for email.
- Message body.
- Optional WhatsApp-friendly version.
- Suggested personalization variables.

AI-generated content must always be editable before sending.

### FR-09 — Preview

The user can preview:

- Raw template.
- Personalized recipient message.
- Subject + body for Gmail.
- WhatsApp message/template rendering.

### FR-10 — Queue Management

Messages should pass through:

```text
VALIDATED → QUEUED → PROCESSING → PROVIDER_ACCEPTED → STATUS_UPDATES → COMPLETED / FAILED
```

### FR-11 — Send One by One

Default mode:

```text
Recipient 1 → Send → Record result → Recipient 2 → Send → ...
```

Architecture should still allow controlled concurrency later.

### FR-12 — Retry

Retry transient failures using exponential backoff.

Example:

```text
Attempt 1 → immediate
Attempt 2 → +30 sec
Attempt 3 → +2 min
Attempt 4 → +10 min
```

Provider-specific retry rules override generic defaults.

### FR-13 — Delivery Checklist

Every recipient gets a state.

Recommended state model:

```text
NOT_STARTED
VALIDATION_FAILED
QUEUED
PROCESSING
SENT
DELIVERED
READ
FAILED
CANCELLED
```

Not every channel supports every state.

### FR-14 — Campaign Controls

User can:

- Start campaign.
- Pause campaign.
- Resume campaign.
- Cancel pending messages.
- Retry failed messages.
- Export result report.

### FR-15 — Search / Filter

Filter by:

- Status.
- Recipient.
- Date.
- Error type.
- Channel.

### FR-16 — Analytics

Dashboard metrics:

- Total recipients.
- Valid recipients.
- Queued.
- Sent.
- Delivered.
- Read.
- Failed.
- Cancelled.
- Success rate.
- Failure rate.

Channel-specific definitions must be clearly labeled.

### FR-17 — Export

Allow export of campaign results as CSV/XLSX.

Columns:

```text
recipient
channel
status
provider_message_id
sent_at
delivered_at
read_at
failure_code
failure_message
```

---

## 9. WhatsApp-Specific Product Rules

The WhatsApp module must be built around the official WhatsApp Business Platform / Cloud API.

Important product behavior:

- Use an authorized business sender.
- Use supported message formats.
- Support approved templates for applicable outbound messaging scenarios.
- Respect opt-in/consent requirements and WhatsApp Business policies.
- Process provider webhooks for delivery/read/failure states.
- Persist the provider message ID (`wamid`) when returned.
- Do not use browser automation as the sending mechanism.

WhatsApp Business Platform webhook examples expose message status notifications, including `sent`, `delivered`, `read`, and `failed`. citeturn982761search0turn982761search1

---

## 10. Gmail-Specific Product Rules

The Gmail module should:

- Use OAuth 2.0.
- Build valid MIME/RFC 2822 email content.
- Encode the message as required by the Gmail API.
- Call Gmail's send endpoint.
- Store the returned Gmail message ID.
- Treat provider acceptance as the send milestone.
- Avoid presenting “delivered” as guaranteed unless a separate verified mechanism establishes it.

The Gmail API documents both direct `messages.send` and draft-based `drafts.send`. citeturn924943search0

---

## 11. UI / UX Requirements

### 11.1 Design Direction

Clean SaaS dashboard.

Design characteristics:

- Minimal.
- Professional.
- Data-dense but readable.
- Strong status visualization.
- Responsive desktop-first experience.
- Clear primary action.

### 11.2 Main Screens

#### Screen 1 — Landing Page

Sections:

- Hero.
- How it works.
- Gmail + WhatsApp support.
- Status tracking.
- Security / compliance messaging.
- CTA.

#### Screen 2 — Dashboard

Cards:

- Active campaigns.
- Total messages.
- Sent.
- Delivered.
- Failed.

#### Screen 3 — Connections

Cards:

- Gmail.
- WhatsApp Business.

Each shows:

- Connected / disconnected.
- Account identifier.
- Last verified time.
- Disconnect action.

#### Screen 4 — Create Campaign

Wizard:

```text
01 Channel
02 Message
03 Recipients
04 Mapping
05 Validation
06 Preview
07 Launch
```

#### Screen 5 — Recipient Mapping

Spreadsheet table with mapping selectors.

#### Screen 6 — Validation Report

Example:

```text
Total rows: 500
Valid: 472
Invalid: 18
Duplicates: 10
```

#### Screen 7 — Campaign Monitor

Progress bar + live recipient checklist.

#### Screen 8 — Campaign Details

Detailed table with filters and error information.

#### Screen 9 — Templates

Saved message templates.

#### Screen 10 — Settings

Account, integrations, security, notification preferences, data retention.

---

## 12. Campaign Dashboard Example

```text
Campaign: Workshop Reminder
Channel: WhatsApp

Progress
██████████████████░░  89%

445 / 500 processed

Sent        420
Delivered   401
Read        355
Failed       19
Queued       55

---------------------------------------------------------------
Recipient         Status       Time       Action
---------------------------------------------------------------
Aarav             Delivered    20:11      View
Riya              Read         20:12      View
Rahul             Failed       20:13      Retry
Sneha             Queued       --         Cancel
```

---

## 13. System Architecture

```text
                         ┌─────────────────────┐
                         │     AutoMessage     │
                         │      Web App        │
                         └──────────┬──────────┘
                                    │
                         REST/JSON / HTTPS
                                    │
                   ┌────────────────▼────────────────┐
                   │           API Layer             │
                   │ Auth / Campaign / Templates    │
                   └────────────────┬────────────────┘
                                    │
             ┌──────────────────────┼──────────────────────┐
             │                      │                      │
     ┌───────▼───────┐      ┌──────▼──────┐      ┌───────▼───────┐
     │ Recipient      │      │ Campaign     │      │ Integration   │
     │ Processor      │      │ Service      │      │ Service       │
     └───────┬───────┘      └──────┬───────┘      └───────┬───────┘
             │                      │                      │
             └──────────────────────┼──────────────────────┘
                                    │
                           ┌────────▼────────┐
                           │     Job Queue   │
                           │ Redis + BullMQ  │
                           └────────┬────────┘
                                    │
                     ┌──────────────┴──────────────┐
                     │                             │
              ┌──────▼──────┐              ┌──────▼────────┐
              │ Gmail Worker │              │ WhatsApp      │
              │ Adapter      │              │ Worker        │
              └──────┬──────┘              └──────┬────────┘
                     │                             │
               Gmail API                    WhatsApp Cloud API
                     │                             │
                     │                      ┌──────▼───────┐
                     │                      │ Webhooks     │
                     │                      └──────┬───────┘
                     │                             │
                     └──────────────┬──────────────┘
                                    │
                           ┌────────▼────────┐
                           │    PostgreSQL    │
                           │ campaigns/jobs  │
                           │ recipients/logs │
                           └─────────────────┘
```

---

## 14. Data Model

### users

```text
id
email
name
password_hash / auth_provider
created_at
updated_at
```

### integrations

```text
id
user_id
provider              // gmail | whatsapp
provider_account_id
access_token_encrypted
refresh_token_encrypted
phone_number_id
status
created_at
updated_at
```

### campaigns

```text
id
user_id
name
channel
status
message_template_id
recipient_source_id
total_count
valid_count
invalid_count
sent_count
delivered_count
read_count
failed_count
created_at
started_at
completed_at
```

### recipient_sources

```text
id
campaign_id
source_type          // csv | xlsx | google_sheet
file_name
storage_key
row_count
created_at
```

### recipients

```text
id
campaign_id
row_number
name
email
phone
variables_json
validation_status
validation_error
created_at
```

### messages

```text
id
campaign_id
recipient_id
channel
rendered_subject
rendered_body
status
provider_message_id
provider_status
attempt_count
last_error_code
last_error_message
queued_at
sent_at
delivered_at
read_at
failed_at
created_at
updated_at
```

### message_events

```text
id
message_id
provider
event_type
provider_event_id
payload_json
occurred_at
received_at
```

### audit_logs

```text
id
user_id
action
entity_type
entity_id
metadata_json
created_at
```

---

## 15. API Design

### Authentication

```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

### Integrations

```http
GET    /api/integrations
GET    /api/integrations/gmail/connect
DELETE /api/integrations/gmail
POST   /api/integrations/whatsapp/connect
DELETE /api/integrations/whatsapp
```

### Campaigns

```http
GET    /api/campaigns
POST   /api/campaigns
GET    /api/campaigns/:id
PATCH  /api/campaigns/:id
POST   /api/campaigns/:id/start
POST   /api/campaigns/:id/pause
POST   /api/campaigns/:id/resume
POST   /api/campaigns/:id/cancel
POST   /api/campaigns/:id/retry-failed
GET    /api/campaigns/:id/export
```

### Recipient Source

```http
POST /api/campaigns/:id/source/upload
GET  /api/campaigns/:id/recipients
POST /api/campaigns/:id/validate
POST /api/campaigns/:id/map-fields
```

### Templates

```http
GET    /api/templates
POST   /api/templates
GET    /api/templates/:id
PATCH  /api/templates/:id
DELETE /api/templates/:id
```

### AI

```http
POST /api/ai/draft-message
POST /api/ai/rewrite-message
POST /api/ai/generate-subject
```

### Webhooks

```http
GET  /api/webhooks/whatsapp
POST /api/webhooks/whatsapp
```

---

## 16. Message State Machine

```text
                 ┌───────────────┐
                 │     DRAFT     │
                 └───────┬───────┘
                         │ launch
                 ┌───────▼───────┐
                 │    QUEUED     │
                 └───────┬───────┘
                         │ worker
                 ┌───────▼───────┐
                 │  PROCESSING   │
                 └───────┬───────┘
                         │ provider accepts
                 ┌───────▼───────┐
                 │     SENT      │
                 └───────┬───────┘
                         │ provider event
          ┌──────────────┼───────────────┐
          │              │               │
      delivered        failed          read
          │              │               │
          ▼              ▼               ▼
     DELIVERED         FAILED           READ
```

Not all states are supported by every integration.

---

## 17. Error Handling

Error categories:

### Validation Errors

- Invalid email.
- Invalid phone number.
- Missing variable.
- Empty recipient.
- Unsupported file.

### Authentication Errors

- Expired access token.
- Revoked authorization.
- Invalid integration credentials.

### Provider Errors

- Rate limiting.
- Invalid sender.
- Unsupported content.
- Template rejection.
- Recipient unavailable.
- Provider service failure.

### Internal Errors

- Queue unavailable.
- Database unavailable.
- Webhook processing failure.
- File parsing failure.

Every failure should expose a user-friendly message and store the raw provider error securely for debugging.

---

## 18. Security Requirements

- TLS/HTTPS everywhere.
- OAuth 2.0 for Gmail.
- Encrypt provider credentials at rest.
- Never store secrets in client-side code.
- Never expose provider access tokens in API responses.
- Use signed/verified webhook processing where supported.
- Use database-level tenant isolation.
- Validate all uploaded files.
- Limit upload sizes.
- Sanitize spreadsheet-derived content before rendering HTML.
- Add CSRF protection where applicable.
- Add rate limiting to user-facing and integration endpoints.
- Add audit logs for sensitive operations.
- Allow user data deletion.
- Avoid storing unnecessary recipient information.
- Define a configurable retention period for campaign data.

---

## 19. Compliance & Responsible Messaging

AutoMessage must be designed for recipients the sender is authorized to contact.

For WhatsApp, the product should enforce a consent/compliance acknowledgement before campaign launch and make clear that WhatsApp Business Platform policies apply. citeturn924943search5

For Gmail, product safeguards should discourage spam-like behavior and provide controlled campaign execution rather than unlimited blasting.

Recommended controls:

- Per-user campaign limits.
- Adjustable sending rate subject to provider limitations.
- Pause button.
- Validation before launch.
- Duplicate detection.
- Recipient suppression list.
- Audit log.
- Clear failure reporting.

---

## 20. Performance Requirements

MVP targets:

- UI initial load: < 3 seconds on a normal broadband connection.
- API p95 latency: < 500 ms for normal CRUD operations.
- Spreadsheet parsing: support at least 10,000 rows in MVP with asynchronous processing for larger files.
- Queue should survive worker restarts.
- Duplicate jobs should not create duplicate sends.
- Webhook processing should be idempotent.

---

## 21. Reliability Requirements

The send system must be durable.

If a worker crashes after receiving a job:

- Job must not disappear silently.
- Message must remain traceable.
- Retry logic must be idempotent.
- Provider message ID should be associated with the internal message where available.

Webhook handlers must also be idempotent because provider events may be retried or arrive out of order.

---

## 22. MVP Scope

### Must Have

- Authentication.
- Gmail OAuth connection.
- WhatsApp Business API integration.
- CSV/XLSX upload.
- Automatic column detection.
- Manual column mapping.
- Email/phone validation.
- Message template editor.
- Variable personalization.
- Preview.
- Queue.
- Sequential/controlled sending.
- Campaign monitoring.
- Per-recipient status checklist.
- Retry failed messages.
- Campaign export.
- Basic audit logging.

### Should Have

- AI message assistant.
- Google Sheets integration.
- Scheduling.
- Saved templates.
- Dashboard analytics.

### Could Have

- Team workspaces.
- Multiple senders.
- A/B testing.
- Advanced analytics.
- Contact groups.
- Webhook/event API for customers.

### Won't Have in MVP

- Personal WhatsApp browser automation.
- Complex CRM.
- Full marketing automation suite.
- Advanced conversational bot builder.

---

## 23. Acceptance Criteria

### Campaign Creation

- [ ] User can create a named campaign.
- [ ] User can select Gmail or WhatsApp.
- [ ] User can choose/create a message template.

### Spreadsheet

- [ ] User can upload CSV/XLSX.
- [ ] System parses headers and rows.
- [ ] System identifies likely email/phone/name columns.
- [ ] User can manually correct mappings.

### Validation

- [ ] Invalid recipients are flagged.
- [ ] Duplicate recipients are identified.
- [ ] Missing template variables are flagged.
- [ ] User cannot launch with unresolved blocking errors.

### Sending

- [ ] Valid messages enter the queue.
- [ ] Messages are sent through the correct provider adapter.
- [ ] Provider message IDs are stored when available.
- [ ] Transient failures are retried safely.

### Tracking

- [ ] User can view each recipient's state.
- [ ] WhatsApp status webhooks update the recipient record.
- [ ] Gmail send success is distinguishable from delivery confirmation.
- [ ] Failed messages expose a retry action.

### Security

- [ ] Tokens are not exposed to frontend code.
- [ ] Sensitive credentials are encrypted.
- [ ] Webhook endpoints are protected.
- [ ] Uploaded data is access-controlled per user/workspace.

---

## 24. Future Roadmap

### Phase 1 — MVP

- Gmail + WhatsApp.
- Spreadsheet import.
- Templates.
- Queue.
- Tracking.

### Phase 2 — Productivity

- Google Sheets.
- Scheduling.
- AI writing assistant.
- Advanced filters.
- Better analytics.

### Phase 3 — Collaboration

- Team workspaces.
- Roles and permissions.
- Shared templates.
- Approval workflow.

### Phase 4 — Platform

Potential channel adapters:

- Outlook.
- SMS providers.
- Telegram Business/approved APIs where applicable.
- Other transactional messaging providers.

---

## 25. Product Success Metrics

Primary metrics:

- Campaign completion rate.
- Percentage of valid recipients.
- Send success rate.
- Provider-confirmed delivery rate where available.
- Failure rate.
- Retry recovery rate.
- Average time to complete campaign.
- Campaigns per active user.
- Returning users.

Quality metrics:

- Duplicate send incidents.
- Incorrect personalization incidents.
- Validation miss rate.
- Queue failure rate.
- Webhook reconciliation rate.

---

## 26. Example End-to-End Scenario

A user has an Excel sheet with 1,000 rows:

```text
Name | Email | Phone | Company | Event_Date
```

The user creates a WhatsApp campaign with:

```text
Hi {{name}},

Reminder: {{event_name}} is scheduled for {{event_date}}.

Regards,
AutoMessage Team
```

AutoMessage:

1. Reads the spreadsheet.
2. Identifies `Phone` as the WhatsApp recipient field.
3. Validates and normalizes phone numbers.
4. Detects duplicate records.
5. Shows a validation report.
6. Generates personalized previews.
7. Places valid messages into the send queue.
8. Sends messages through the official WhatsApp Business integration.
9. Receives provider status webhooks.
10. Updates each recipient from `QUEUED` → `SENT` → `DELIVERED` → `READ` where those events are available.
11. Marks failed recipients separately.
12. Allows retry/export.

For Gmail, the same flow applies with `Email` as the recipient field, with the status model adjusted to avoid implying recipient-level delivery confirmation that Gmail's sending API does not itself provide. citeturn924943search0turn924943search6

---

## 27. Final Product Definition

AutoMessage is a **channel-agnostic campaign execution layer** built around three primitives:

```text
RECIPIENT DATA
      +
MESSAGE TEMPLATE
      +
CHANNEL ADAPTER
      ↓
AUTOMATED CAMPAIGN
TRACKED MESSAGE EVENTS
```

The most important architectural principle is separation between the **campaign engine** and the **provider adapters**. Gmail and WhatsApp should be independent delivery adapters behind a common messaging interface, making the system easier to test, maintain, and extend.
