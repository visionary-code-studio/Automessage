# AutoMessage — Multi-Channel Bulk Messaging Platform

A high-performance bulk messaging SaaS platform supporting **WhatsApp Web QR Code bridge**, **WhatsApp Cloud API**, and **Gmail** with spreadsheet parsing, syntax validation, template personalization, and live real-time cockpit tracking via Server-Sent Events (SSE).

---

## 🚀 Key Features

- **WhatsApp Web QR Code Linker (Alternate 1)**: Link any personal or business WhatsApp account in seconds via QR code without Meta Business verification or developer accounts.
- **Official Meta Cloud API & Gmail**: Optional enterprise channels with OAuth2/SMTP support.
- **Spreadsheet Parsing & Validation**: Parse `.csv` and `.xlsx` files with automatic column detection for Phone, Email, and Name. E.164 phone normalization and duplicate detection.
- **Direct Number Pasting**: Fast bulk sending by directly typing/pasting recipient numbers.
- **Dynamic Template Personalization**: Support for `{{Name}}`, `{{Company}}`, `{{EventName}}`, and any custom variable column.
- **Sequential Throttled Queue Engine**: Async non-blocking background queue with rate limiting to safeguard phone numbers against spam flags.
- **Real-Time Live Cockpit**: Server-Sent Events (SSE) tracking status transitions (`QUEUED` ➔ `PROCESSING` ➔ `SENT` ➔ `DELIVERED` ➔ `READ` ➔ `FAILED`).
- **Cross-Device & Cross-Browser**: Fully responsive layout with mobile drawer, touch-friendly UI, and responsive tables.

---

## 🛠 Project Structure

```text
AutoMessage/
├── backend/
│   ├── adapters/          # WhatsApp (Baileys/Meta) & Gmail adapters
│   ├── services/          # Queue engine, validator, spreadsheet parser, AI copilot
│   ├── database.py        # SQLite WAL schema
│   ├── models.py          # Pydantic v2 schemas
│   └── main.py            # FastAPI application
├── frontend/
│   ├── src/               # React 19 UI components & responsive Vanilla CSS design system
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── whatsapp_bridge/
│   ├── server.js          # @whiskeysockets/baileys QR session microservice
│   └── package.json
├── vercel.json            # Vercel deployment configuration
└── requirements.txt
```

---

## ⚡ Quickstart (Local Development)

### 1. Start WhatsApp Bridge
```bash
cd whatsapp_bridge
npm install
node server.js
```
The bridge starts on `http://127.0.0.1:3001`.

### 2. Install Backend & Start FastAPI
```bash
pip install -r requirements.txt
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

### 3. Build & Run Frontend
```bash
cd frontend
npm install
npm run build
```
Open **`http://localhost:8000`** in your browser!

---

## 🌐 How to Deploy on Vercel

AutoMessage has a frontend React SPA and a background Python/Node backend service.

### Recommended Architecture:
1. **Frontend**: Hosted on **Vercel** for edge CDN speed and automatic SSL.
2. **Backend & WhatsApp Bridge**: Hosted on **Render**, **Railway**, **Fly.io**, or any cloud VPS (Ubuntu/Debian) because WhatsApp Web sessions require a persistent WebSocket connection.

### Steps to Deploy Frontend to Vercel:
1. Push this repository to GitHub: `https://github.com/visionary-code-studio/Automessage`.
2. Go to [Vercel Dashboard](https://vercel.com/new).
3. Import the `Automessage` repository.
4. Set:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. In your `vercel.json` (or Environment Variables), set your production backend URL so API calls route seamlessly.
