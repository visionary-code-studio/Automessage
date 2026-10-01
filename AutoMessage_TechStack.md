# AutoMessage — Technical Stack & Architecture

**Product:** AutoMessage  
**Purpose:** Bulk message campaign automation through Gmail and WhatsApp Business  
**Architecture:** Modular SaaS + API + Durable Queue + Provider Adapters  
**Recommended Stack:** Next.js + TypeScript + Node.js + PostgreSQL + Redis/BullMQ + Gmail API + WhatsApp Business Cloud API

---

## 1. Recommended Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js (App Router) | SaaS web application |
| Language | TypeScript | Type safety across frontend/backend |
| UI | Tailwind CSS | Utility-first styling |
| Components | shadcn/ui | Consistent dashboard components |
| Icons | Lucide React | UI icons |
| Tables | TanStack Table | Recipient and campaign tables |
| Forms | React Hook Form + Zod | Validation |
| Charts | Recharts | Campaign analytics |
| Backend API | Node.js + Fastify or NestJS | REST API and service layer |
| ORM | Prisma | PostgreSQL access |
| Database | PostgreSQL | Users, campaigns, messages, events |
| Queue | Redis + BullMQ | Durable background message jobs |
| Cache | Redis | Rate limits, temporary state, queue support |
| Auth | Auth.js or Clerk | Authentication/session management |
| Email Provider | Gmail API | Authorized Gmail sending |
| WhatsApp Provider | WhatsApp Business Platform / Cloud API | Authorized WhatsApp business messaging |
| File Parsing | SheetJS (`xlsx`) + Papa Parse | XLSX/CSV parsing |
| File Storage | S3-compatible storage / Cloudflare R2 | Original spreadsheet storage |
| Validation | Zod + `libphonenumber-js` | Schema + phone normalization |
| Email Parsing | `validator` / custom rules | Email syntax checks |
| AI | OpenAI API or Gemini API | Message drafting/rewrite |
| Observability | Sentry + OpenTelemetry | Errors, traces, monitoring |
| Logging | Pino | Structured server logs |
| Testing | Vitest + Playwright | Unit/API/E2E tests |
| API Docs | OpenAPI / Swagger | API documentation |
| Deployment | Vercel + managed container/worker | Frontend + API/worker deployment |
| CI/CD | GitHub Actions | Build, test, deploy |
| Secrets | Platform secret manager / environment secrets | API credentials |

---

## 2. Architecture Principle

AutoMessage should use a **provider adapter architecture**.

```text
Campaign Engine
      |
      +---------------------+
      |                     |
 GmailAdapter         WhatsAppAdapter
      |                     |
 Gmail API             WhatsApp API
```

The campaign engine should not contain Gmail- or WhatsApp-specific business logic.

### Common interface

```ts
interface MessagingProvider {
  validateRecipient(input: string): ValidationResult;
  sendMessage(message: OutboundMessage): Promise<ProviderSendResult>;
  getCapabilities(): ProviderCapabilities;
}
```

Example provider capabilities:

```ts
interface ProviderCapabilities {
  supportsText: boolean;
  supportsHtml: boolean;
  supportsTemplates: boolean;
  supportsDeliveryEvents: boolean;
  supportsReadEvents: boolean;
  supportsAttachments: boolean;
}
```

---

## 3. Frontend Stack

### Next.js

Use Next.js App Router for:

- Landing page.
- Authenticated dashboard.
- Campaign wizard.
- Campaign monitor.
- Settings.
- Server-side rendering where useful.

### TypeScript

Required for:

- Shared API types.
- Provider interfaces.
- Form schemas.
- Database types.
- Message state enums.

### Tailwind CSS

Used for:

- SaaS dashboard layout.
- Responsive grids.
- Status badges.
- Forms.
- Tables.
- Modal/drawer interfaces.

### shadcn/ui

Recommended components:

- Button.
- Dialog.
- Sheet.
- Dropdown Menu.
- Select.
- Tabs.
- Card.
- Badge.
- Progress.
- Data table patterns.
- Toast/Sonner.

### TanStack Table

Use for:

- Spreadsheet preview.
- Recipient list.
- Campaign message log.
- Error queue.

---

## 4. Backend Stack

### Option A — Recommended for fast development

```text
Node.js
TypeScript
Fastify
Prisma
PostgreSQL
BullMQ
Redis
```

Fastify is suitable for a lightweight API layer with high throughput and straightforward plugin architecture.

### Option B — Enterprise-oriented

```text
Node.js
TypeScript
NestJS
Prisma
PostgreSQL
BullMQ
Redis
```

NestJS is useful if the codebase is expected to become a large multi-module platform with stronger conventions.

### Recommendation

For the initial AutoMessage build, use **Fastify + TypeScript** if speed and simplicity are priorities. Use **NestJS** if the project is planned as a larger team-maintained SaaS platform.

---

## 5. Database — PostgreSQL

PostgreSQL should be the system of record.

### Why PostgreSQL?

- Strong relational integrity.
- Transactions.
- JSONB for flexible spreadsheet variables.
- Indexing.
- Mature tooling.
- Good fit for multi-tenant SaaS data.

### Core tables

```text
users
workspaces
workspace_members
integrations
campaigns
message_templates
recipient_sources
recipients
messages
message_events
audit_logs
api_keys
suppression_contacts
```

---

## 6. Suggested PostgreSQL Relationships

```text
User
 │
 ├── Workspace
 │     │
 │     ├── Integrations
 │     ├── Campaigns
 │     │    ├── RecipientSource
 │     │    ├── Recipients
 │     │    │     └── Messages
 │     │    └── MessageTemplate
 │     ├── SuppressionContacts
 │     └── AuditLogs
 │
 └── Sessions
```

For an MVP with only one owner per account, `workspace` can still be retained in the schema so team collaboration can be added without a major migration later.

---

## 7. Redis + BullMQ

Redis is used for the asynchronous execution layer.

### Queues

```text
campaign-validation
campaign-send
message-retry
webhook-processing
report-export
ai-generation
```

### Example job

```json
{
  "messageId": "msg_123",
  "campaignId": "cmp_456",
  "recipientId": "rec_789",
  "provider": "whatsapp"
}
```

### Worker flow

```text
Queue Job
   ↓
Load Message
   ↓
Check Campaign State
   ↓
Check Recipient Validation
   ↓
Load Provider Credential
   ↓
Render Message
   ↓
Provider Adapter
   ↓
Persist Provider Response
   ↓
Update Message State
```

---

## 8. Idempotency Strategy

Bulk messaging systems must treat duplicate sends as a critical failure mode.

Each outbound message must have:

```text
internal_message_id
idempotency_key
provider_message_id
attempt_count
```

Before sending:

```text
if message.status in [SENT, DELIVERED, READ]:
    do not resend
```

Provider-specific semantics should be respected where available.

Webhook events must also be idempotent.

Recommended unique constraint:

```text
(provider, provider_event_id)
```

---

## 9. Gmail Integration

### Authentication

Use Google OAuth 2.0.

Suggested flow:

```text
AutoMessage
    ↓
Google OAuth
    ↓
User Grants Gmail Permission
    ↓
Authorization Code
    ↓
Backend Exchanges Code
    ↓
Encrypted Token Storage
```

### Sending

Gmail API supports direct sending with `messages.send` and sending drafts with `drafts.send`. The message content is provided in the Gmail message resource using the required encoding. citeturn924943search0turn924943search1

### Gmail adapter

```ts
class GmailAdapter implements MessagingProvider {
  async validateRecipient(email: string) {}

  async sendMessage(message: OutboundMessage) {
    // Build MIME message
    // Base64URL encode
    // Call Gmail API messages.send
    // Persist returned Gmail message ID
  }

  getCapabilities() {
    return {
      supportsText: true,
      supportsHtml: true,
      supportsTemplates: true,
      supportsDeliveryEvents: false,
      supportsReadEvents: false,
      supportsAttachments: true,
    };
  }
}
```

### Gmail status model

Recommended:

```text
QUEUED
→ PROCESSING
→ SENT
→ FAILED
```

Do not automatically map `SENT` to `DELIVERED`.

---

## 10. WhatsApp Business Integration

### Provider

Use the official WhatsApp Business Platform / Cloud API.

### Configuration

Required integration data will depend on the current Meta onboarding/API model, but the backend should be structured around:

```text
business account identifier
phone number ID
access credential/token
webhook verification configuration
```

### Sending flow

```text
Campaign Worker
     ↓
WhatsApp Adapter
     ↓
WhatsApp Business Cloud API
     ↓
Provider Message ID (wamid)
     ↓
Persist message mapping
     ↓
Wait for webhook events
     ↓
sent / delivered / read / failed
```

WhatsApp Business Platform webhook documentation/examples expose outbound message status events such as `sent`, `delivered`, `read`, and `failed`. citeturn982761search0turn982761search1

### WhatsApp adapter

```ts
class WhatsAppAdapter implements MessagingProvider {
  async validateRecipient(phone: string) {}

  async sendMessage(message: OutboundMessage) {
    // Build WhatsApp Cloud API payload
    // Send request
    // Persist wamid
  }

  getCapabilities() {
    return {
      supportsText: true,
      supportsHtml: false,
      supportsTemplates: true,
      supportsDeliveryEvents: true,
      supportsReadEvents: true,
      supportsAttachments: true,
    };
  }
}
```

### Webhook endpoint

```http
GET /api/webhooks/whatsapp
POST /api/webhooks/whatsapp
```

Webhook processor:

```text
Receive Webhook
     ↓
Verify Request
     ↓
Parse Event
     ↓
Check Event Idempotency
     ↓
Find Message by provider_message_id
     ↓
Update State
     ↓
Insert message_event
     ↓
Acknowledge quickly
```

### Important

Do not build the WhatsApp module around Selenium, Playwright, WhatsApp Web DOM selectors, session cookies, QR scraping, or unofficial reverse-engineered endpoints.

The product should remain within official Business Platform/API mechanisms and applicable policies. citeturn924943search5

---

## 11. Spreadsheet Processing

### CSV

Use:

```text
Papa Parse
```

### XLSX

Use:

```text
SheetJS (xlsx)
```

### Pipeline

```text
Upload
 ↓
Virus / file-type check
 ↓
Parse
 ↓
Header detection
 ↓
Row normalization
 ↓
Column inference
 ↓
Validation
 ↓
Preview
 ↓
Persist source + recipients
```

### Normalized recipient object

```ts
interface NormalizedRecipient {
  rowNumber: number;
  name?: string;
  email?: string;
  phone?: string;
  variables: Record<string, string>;
}
```

---

## 12. Email Validation

Basic validation should check:

- Required field present.
- Syntax.
- Normalized casing where appropriate.
- Duplicate value.
- Obvious malformed addresses.

Do not claim that syntax validation proves an inbox exists.

Example:

```ts
function validateEmail(email: string): ValidationResult {
  // Syntax-level validation only.
}
```

---

## 13. Phone Number Validation

Use `libphonenumber-js`.

Workflow:

```text
Raw value
   ↓
Trim spaces / punctuation
   ↓
Apply selected default country if required
   ↓
Parse
   ↓
Validate
   ↓
Normalize to E.164
```

Example:

```text
98765 43210
      ↓
+919876543210
```

The system should not infer a country when doing so could create ambiguity. Ask the user to choose a default country during mapping/configuration when needed.

---

## 14. Template Rendering

Use a deliberately constrained templating system rather than arbitrary executable expressions.

Example:

```text
Hello {{name}},
Your registration for {{event_name}} is confirmed.
```

Renderer:

```ts
render(template, variables)
```

Rules:

- Unknown variable → validation error.
- Missing recipient value → configurable fallback or block.
- HTML escaping for Gmail HTML content.
- Never evaluate arbitrary JavaScript from templates.

---

## 15. AI Layer

AI is an optional assistant, not the sending authority.

### Use cases

- Draft initial message.
- Rewrite for tone.
- Shorten message.
- Create email subject.
- Create WhatsApp-safe version.
- Suggest variables.

### Suggested interface

```ts
POST /api/ai/draft-message
```

Input:

```json
{
  "channel": "gmail",
  "goal": "Invite registered students to a workshop",
  "tone": "professional",
  "audience": "college students"
}
```

Output:

```json
{
  "subject": "Workshop Reminder",
  "body": "...",
  "variables": ["name", "event_date"]
}
```

AI output must remain editable and must not automatically launch a campaign.

---

## 16. API Layer

Recommended REST structure:

```text
/api/auth/*
/api/users/*
/api/integrations/*
/api/campaigns/*
/api/recipients/*
/api/messages/*
/api/templates/*
/api/ai/*
/api/webhooks/*
```

Use OpenAPI for API documentation.

---

## 17. Authentication & Authorization

### Recommended MVP

```text
Auth.js / Clerk
```

### Authorization model

```text
User
  ↓
Workspace
  ↓
Role
```

Possible roles:

```text
OWNER
ADMIN
OPERATOR
VIEWER
```

Permissions should be resource-based.

Example:

```text
campaign:create
campaign:start
campaign:pause
campaign:export
integration:manage
```

---

## 18. Multi-Tenancy

Every business-owned entity should have:

```text
workspace_id
```

Tenant isolation must be enforced at the data-access layer.

Never trust `workspace_id` supplied directly by the client.

Recommended pattern:

```text
Authenticated User
      ↓
Resolve Workspace Membership
      ↓
Authorize Operation
      ↓
Query by workspace_id
```

---

## 19. File Storage

Original spreadsheets should be stored in object storage rather than PostgreSQL.

Recommended options:

- AWS S3.
- Cloudflare R2.
- Google Cloud Storage.

Store only metadata in PostgreSQL:

```text
file_name
mime_type
size_bytes
storage_key
checksum
uploaded_at
```

---

## 20. Background Worker Architecture

Separate workers from the web server.

```text
                    ┌──────────────┐
                    │  Next.js UI  │
                    └──────┬───────┘
                           API
                            │
                    ┌──────▼──────┐
                    │ API Server   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │    Redis     │
                    │    Queue     │
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
        ┌─────▼─────┐             ┌─────▼─────┐
        │ Send      │             │ Webhook   │
        │ Workers   │             │ Worker    │
        └───────────┘             └───────────┘
```

This prevents long-running send tasks from blocking web requests.

---

## 21. Rate Limiting

Rate limiting should exist at several layers:

### User/API rate limit

Protect REST endpoints.

### Campaign rate limit

Control messages/minute based on channel and provider constraints.

### Provider retry/backoff

Respect provider responses such as rate-limit or temporary-error signals.

### Global safety control

Allow administrators to pause all outbound campaign jobs.

Do not hard-code provider limits as permanent constants; make them configurable because provider policies/quotas can change.

---

## 22. Observability

### Logging

Use Pino.

Every log should include structured context where applicable:

```json
{
  "requestId": "req_123",
  "workspaceId": "ws_123",
  "campaignId": "cmp_123",
  "messageId": "msg_123",
  "provider": "whatsapp"
}
```

Avoid logging:

- Access tokens.
- Refresh tokens.
- API secrets.
- Full recipient lists.
- Sensitive message bodies unless explicitly required and protected.

### Monitoring

Use:

- Sentry.
- OpenTelemetry.
- Provider/webhook error counters.
- Queue depth.
- Job latency.
- Failed sends.
- Webhook lag.

---

## 23. Testing Strategy

### Unit Tests

Test:

- Email normalization.
- Phone normalization.
- Spreadsheet mapping.
- Template rendering.
- State transitions.
- Retry policy.
- Provider adapter payload generation.

### Integration Tests

Test:

- PostgreSQL repositories.
- Redis/BullMQ jobs.
- Gmail adapter with mocked Google API.
- WhatsApp adapter with mocked Meta API.
- Webhook processing.

### E2E Tests

Use Playwright for:

```text
Login → Create Campaign → Upload File → Map → Validate → Preview → Start → Monitor
```

### Idempotency Tests

Specifically test:

- Worker restart.
- Duplicate queue job.
- Duplicate webhook.
- Out-of-order webhook events.
- Retry after timeout.

---

## 24. CI/CD

GitHub Actions pipeline:

```text
Pull Request
   ↓
lint
   ↓
typecheck
   ↓
unit tests
   ↓
build
   ↓
e2e tests
   ↓
security checks
   ↓
merge
   ↓
deploy
```

Recommended branches:

```text
main
staging
feature/*
```

---

## 25. Deployment Architecture

### MVP Deployment

```text
Vercel
 └── Next.js frontend / API routes where suitable

Managed Container Platform
 └── API server

Managed Worker
 └── BullMQ workers

Managed PostgreSQL
 └── Neon / Supabase / AWS RDS / Railway

Managed Redis
 └── Upstash / Redis Cloud / AWS ElastiCache

Object Storage
 └── Cloudflare R2 / S3
```

### Important architectural note

Do not put long-running queue workers inside an environment intended only for short-lived serverless request execution.

The web app and background workers should be deployable independently.

---

## 26. Environment Variables

Example `.env.example`:

```env
# App
NODE_ENV=development
APP_URL=http://localhost:3000

# Database
DATABASE_URL=

# Redis
REDIS_URL=

# Auth
AUTH_SECRET=

# Google
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

# WhatsApp / Meta
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=
WHATSAPP_APP_SECRET=

# Object Storage
STORAGE_BUCKET=
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=
STORAGE_ENDPOINT=

# AI
OPENAI_API_KEY=
# or
GEMINI_API_KEY=

# Observability
SENTRY_DSN=
```

Never commit actual values.

---

## 27. Recommended Repository Structure

```text
automessage/
│
├── apps/
│   ├── web/
│   │   ├── app/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── styles/
│   │
│   └── api/
│       ├── routes/
│       ├── controllers/
│       ├── services/
│       ├── middleware/
│       └── config/
│
├── workers/
│   ├── campaign-worker/
│   ├── webhook-worker/
│   └── report-worker/
│
├── packages/
│   ├── db/
│   ├── types/
│   ├── validation/
│   ├── messaging-core/
│   ├── provider-gmail/
│   ├── provider-whatsapp/
│   └── ui/
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── docs/
│
├── .env.example
├── docker-compose.yml
├── package.json
└── README.md
```

A monorepo with Turborepo or pnpm workspaces is recommended once API, web, and workers are separated.

---

## 28. Shared Types

Create provider-agnostic types.

```ts
export type Channel = 'gmail' | 'whatsapp';

export type MessageStatus =
  | 'NOT_STARTED'
  | 'VALIDATION_FAILED'
  | 'QUEUED'
  | 'PROCESSING'
  | 'SENT'
  | 'DELIVERED'
  | 'READ'
  | 'FAILED'
  | 'CANCELLED';
```

Provider-specific events should map into the common internal state model.

---

## 29. Security Model

### Token Storage

Provider credentials:

- Encrypt at rest.
- Access only from backend integration service.
- Do not send to browser.
- Rotate/revoke when user disconnects.

### Webhooks

- Validate verification handshake.
- Validate authenticity/signature mechanism supported by provider.
- Reject malformed payloads.
- Store event ID for deduplication.
- Return acknowledgement quickly.
- Move heavy processing to a worker.

### Data Isolation

Every database operation must be authorized through the authenticated workspace.

---

## 30. API Example — Create Campaign

```http
POST /api/campaigns
Content-Type: application/json
Authorization: Bearer <session>
```

```json
{
  "name": "Workshop Reminder",
  "channel": "whatsapp",
  "templateId": "tpl_123",
  "recipientSourceId": "src_456"
}
```

Response:

```json
{
  "id": "cmp_789",
  "status": "DRAFT"
}
```

---

## 31. API Example — Start Campaign

```http
POST /api/campaigns/cmp_789/start
```

Response:

```json
{
  "campaignId": "cmp_789",
  "status": "QUEUED",
  "queuedMessages": 472
}
```

---

## 32. Webhook Event Mapping

Example internal mapping:

| WhatsApp Provider Event | Internal State |
|---|---|
| `sent` | `SENT` |
| `delivered` | `DELIVERED` |
| `read` | `READ` |
| `failed` | `FAILED` |

Persist both:

```text
internal_state
provider_status
```

This preserves provider-specific details without coupling the UI to the provider API.

---

## 33. Gmail Status Mapping

Recommended:

| Gmail event | Internal State |
|---|---|
| queued | `QUEUED` |
| worker processing | `PROCESSING` |
| Gmail API accepted/send call successful | `SENT` |
| provider/API error | `FAILED` |

Do not fabricate `DELIVERED` or `READ` states for Gmail unless a separately implemented and reliable mechanism establishes them.

---

## 34. Data Retention

Recommended configurable defaults:

```text
Campaign logs: 90 days
Webhook payloads: 30 days
Uploaded source files: 30 days
Audit logs: 180 days+
```

These values are product defaults, not universal legal requirements. Retention should be configurable according to the deployment's legal/compliance requirements.

---

## 35. MVP Build Order

### Phase 1 — Foundation

```text
Next.js
Auth
PostgreSQL
Prisma
Dashboard shell
```

### Phase 2 — Recipient Engine

```text
CSV/XLSX upload
Parser
Column mapping
Email validation
Phone validation
Variable extraction
```

### Phase 3 — Messaging Core

```text
Template engine
Campaign service
Message model
Redis
BullMQ
Worker
```

### Phase 4 — Gmail

```text
OAuth
Gmail adapter
Send flow
Message IDs
Error handling
```

### Phase 5 — WhatsApp

```text
Meta/WhatsApp Business setup
WhatsApp adapter
Webhook verification
Status event processing
```

### Phase 6 — Monitoring

```text
Campaign progress
Checklist table
Retry
Export
Analytics
```

### Phase 7 — AI

```text
Draft
Rewrite
Subject generation
Channel adaptation
```

---

## 36. Suggested MVP Stack Summary

```text
Frontend
  Next.js + TypeScript
  Tailwind CSS
  shadcn/ui
  TanStack Table

Backend
  Node.js + TypeScript
  Fastify
  Prisma

Data
  PostgreSQL
  Redis

Jobs
  BullMQ

Integrations
  Gmail API
  WhatsApp Business Cloud API

Files
  SheetJS + Papa Parse
  S3/R2

Validation
  Zod
  libphonenumber-js

AI
  OpenAI API or Gemini API

Testing
  Vitest
  Playwright

Observability
  Sentry
  OpenTelemetry
  Pino

Deployment
  Vercel + containerized API/worker
  Managed PostgreSQL
  Managed Redis
  S3/R2

CI/CD
  GitHub Actions
```

---

## 37. Technical Decision Summary

### Why Next.js?

Single modern React framework for the SaaS dashboard, routing, UI, and server-side functionality.

### Why TypeScript?

The application has multiple state machines, provider adapters, integrations, and data contracts. Static typing reduces integration errors.

### Why PostgreSQL?

Campaigns, recipients, messages, and provider events are highly relational and need transactional integrity.

### Why Redis/BullMQ?

Sending is asynchronous. Queue workers provide retries, controlled concurrency, pause/resume, and resilience.

### Why Provider Adapters?

Gmail and WhatsApp have different capabilities and status semantics. Adapters isolate provider-specific behavior from the campaign engine.

### Why webhooks?

Provider-side status updates must be processed asynchronously rather than assumed from an initial send request.

---

## 38. Final Architecture

```text
                           AUTOMESSAGE
                               │
                 ┌─────────────┴─────────────┐
                 │                           │
             Next.js UI                 API Server
                 │                           │
                 │                    Campaign Service
                 │                           │
                 │                    Template Service
                 │                           │
                 │                    Recipient Service
                 │                           │
                 │                    Integration Service
                 │                           │
                 │                      PostgreSQL
                 │                           │
                 │                         Redis
                 │                           │
                 │                     BullMQ Workers
                 │                           │
         ┌───────┴────────┐        ┌─────────┴──────────┐
         │                │        │                    │
    Gmail Adapter   WhatsApp Adapter              Webhook Worker
         │                │                             │
    Gmail API       WhatsApp Cloud API           WhatsApp Webhooks
         │                │                             │
         └────────────────┴──────────────┬──────────────┘
                                         │
                                  Message Events
                                         │
                                   Campaign Tracker
```

---

## 39. Engineering Principles

1. **Official APIs first.** Do not depend on browser automation or reverse-engineered communication protocols.
2. **Provider-agnostic core.** Campaign logic must not depend directly on Gmail/WhatsApp implementation details.
3. **Durable jobs.** Every outbound message should be recoverable and traceable.
4. **Idempotency by default.** Duplicate sending is a critical failure mode.
5. **Explicit status semantics.** Never label a message as delivered when the provider only accepted it for sending.
6. **Least privilege.** Request only the permissions required for the user-selected integration.
7. **User-controlled execution.** AI can draft, validate, and assist; the user controls campaign launch.
8. **Compliance-aware design.** Build provider policy constraints into the product rather than trying to work around them.

---

## 40. Reference Documentation

- Gmail API sending guide: https://developers.google.com/workspace/gmail/api/guides/sending
- Gmail API overview: https://developers.google.com/workspace/gmail/api/guides
- WhatsApp Business policies: https://business.whatsapp.com/policy
- Meta WhatsApp Business Platform status/webhook examples: https://www.postman.com/meta/whatsapp-business-platform/
