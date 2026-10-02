FROM python:3.11-slim

# Install Node.js 20 LTS for WhatsApp Baileys bridge
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    gnupg \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list \
    && apt-get update \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Node.js dependencies for the WhatsApp bridge
COPY whatsapp_bridge/package*.json ./whatsapp_bridge/
RUN cd whatsapp_bridge && npm install --production

# Copy application source code
COPY backend/ ./backend/
COPY whatsapp_bridge/ ./whatsapp_bridge/
COPY start.sh ./start.sh

RUN chmod +x ./start.sh

ENV PYTHONUNBUFFERED=1
ENV PORT=8000
ENV WHATSAPP_BRIDGE_URL=http://127.0.0.1:3001

EXPOSE 8000

CMD ["./start.sh"]
