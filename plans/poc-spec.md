Here is the complete specification in Markdown format.

```markdown
# Minimal AI Platform Specification (M1 Mac + Docker)

## 1. Overview
This platform provides a self-hosted, private AI environment designed for Apple Silicon (M1/M2/M3) devices. It uses a micro-service architecture with three core open-source components:

1.  **Open WebUI**: A full-featured chat interface (similar to ChatGPT) with session history and multi-user support.
2.  **LiteLLM Proxy**: A unified API Gateway that manages API keys, rate limits, and translates requests to the inference engine.
3.  **Inference Engine**:
    *   **Option A (Standard)**: Dockerized `ollama` (CPU-only on Mac due to Docker limitations).
    *   **Option B (Performance)**: Native `Ollama for Mac` (enables Metal GPU acceleration).

## 2. Directory Structure
Create a project folder named `ai-platform` with the following layout:

```text
ai-platform/
├── docker-compose.yml
├── litellm/
│   └── config.yaml
├── ollama/               # Persists model data (Option A only)
│   └── (auto-created)
├── openwebui/            # Persists chat history & user db
│   └── (auto-created)
└── scripts/
    └── init-platform.sh
```

---

## 3. Configuration Files

### A. LiteLLM Gateway Config
Create `litellm/config.yaml`. This file routes API requests to the Ollama service.

```yaml
model_list:
  - model_name: llama3
    litellm_params:
      # Option A (Docker): Use "http://ollama:11434"
      # Option B (Native): Use "http://host.docker.internal:11434" (See Section 6)
      model: ollama/llama3
      api_base: "http://ollama:11434"

general_settings:
  master_key: "sk-admin-master-secret" # Admin Master Key
```

### B. Service Orchestration
Create `docker-compose.yml`. This defines the services and networking.

```yaml
services:
  # Service 1: Inference Engine (CPU Only)
  # Comment this service out if using Option B (Native Mac App)
  ollama:
    image: ollama/ollama:latest
    container_name: ai-ollama
    volumes:
      - ./ollama:/root/.ollama
    ports:
      - "11434:11434"
    restart: always

  # Service 2: AI Gateway (API Key Manager & Rate Limiter)
  litellm:
    image: ghcr.io/berriai/litellm:main-latest
    container_name: ai-gateway
    ports:
      - "4000:4000"
    volumes:
      - ./litellm/config.yaml:/app/config.yaml
    command: [ "--config", "/app/config.yaml", "--port", "4000", "--detailed_debug"]
    environment:
      LITELLM_MASTER_KEY: "sk-admin-master-secret"
    # Essential for Option B: Allows container to see Host IP
    extra_hosts:
      - "host.docker.internal:host-gateway" 

  # Service 3: Web UI (Chat Interface)
  open-webui:
    image: ghcr.io/open-webui/open-webui:main
    container_name: ai-webui
    ports:
      - "3000:8080"
    environment:
      # Connects WebUI to the Gateway (LiteLLM)
      OPENAI_API_BASE_URL: "http://litellm:4000/v1"
      OPENAI_API_KEY: "sk-admin-master-secret"
      # Auto-create Admin User
      WEBUI_ADMIN_EMAIL: "admin@example.com"
      WEBUI_ADMIN_PASSWORD: "admin_password123"
      # Security Settings
      ENABLE_SIGNUP: "false"  # Only admin can create users
      WEBUI_AUTH: "true"      # Enforce login
    volumes:
      - ./openwebui:/app/backend/data
    depends_on:
      - litellm
```

### C. Initialization Script
Create `scripts/init-platform.sh`. Make it executable with `chmod +x scripts/init-platform.sh`.

```bash
#!/bin/bash

echo "🚀 Starting AI Platform..."
docker compose up -d

# Only pull model if using Dockerized Ollama (Option A)
if [ "$(docker ps -q -f name=ai-ollama)" ]; then
    echo "⏳ Waiting for services to initialize..."
    sleep 30
    echo "📥 Pulling Llama3 model (Dockerized)..."
    docker exec ai-ollama ollama pull llama3
else
    echo "⚠️  Using External/Native Ollama. Ensure you have run 'ollama pull llama3' locally."
fi

echo "🔑 Generating API Key for 'Sample User'..."
# Uses the LiteLLM Master Key to generate a tracked user key
RESPONSE=$(curl -s -X POST "http://localhost:4000/key/generate" \
    -H "Authorization: Bearer sk-admin-master-secret" \
    -H "Content-Type: application/json" \
    -d '{
          "models": ["llama3"], 
          "duration": "null", 
          "metadata": {"user": "sample_dev_user"}
        }')

USER_KEY=$(echo $RESPONSE | grep -o '"key":"[^"]*' | cut -d'"' -f4)

echo ""
echo "=================================================="
echo "✅ Setup Complete!"
echo "--------------------------------------------------"
echo "🖥️  Web UI:        http://localhost:3000"
echo "   Login:         admin@example.com / admin_password123"
echo "--------------------------------------------------"
echo "🛡️  Admin Gateway: http://localhost:4000/ui"
echo "   Master Key:    sk-admin-master-secret"
echo "--------------------------------------------------"
echo "🗝️  Sample API Key: $USER_KEY"
echo "   Endpoint:      http://localhost:4000/v1"
echo "=================================================="
```

---

## 4. Usage Guide

1.  **Start**: Run `./scripts/init-platform.sh`
2.  **Web UI**: Login at `http://localhost:3000` to chat.
3.  **Code/API**: Use the generated Sample Key in your Python/JS scripts.
4.  **Admin**: Visit `http://localhost:4000/ui` to monitor usage or revoke keys.

---

## 5. (New) Optional: Native GPU Acceleration (Ollama for Mac)

**Why do this?**
Docker containers on macOS cannot access the Metal GPU. This means models run on the CPU, which is significantly slower. To get full speed, run Ollama natively on macOS and connect Docker to it.

### Step 1: Install & Configure Native Ollama
1.  Download [Ollama for Mac](https://ollama.com).
2.  **Crucial Step**: By default, Ollama only listens to `localhost`. You must allow external connections so the Docker container can reach it.
    *   Run this command in your terminal:
        ```bash
        launchctl setenv OLLAMA_HOST "0.0.0.0"
        ```
    *   **Restart the Ollama app** completely (Quit from menu bar, then open it again).
3.  Pull the model locally:
    ```bash
    ollama pull llama3
    ```

### Step 2: Update `docker-compose.yml`
Comment out or remove the `ollama` service block entirely. The `litellm` service already includes `extra_hosts: - "host.docker.internal:host-gateway"`, which is required for this connection.

### Step 3: Update `litellm/config.yaml`
Change the `api_base` to point to the host machine instead of the internal docker container.

```yaml
model_list:
  - model_name: llama3
    litellm_params:
      model: ollama/llama3
      # CHANGED: Points to the host machine's IP
      api_base: "http://host.docker.internal:11434"
```

### Step 4: Restart
Run `docker compose down` and then `./scripts/init-platform.sh`. Your Web UI will now utilize the full power of your M1/M2/M3 GPU.
```