# Minimal AI Platform

A self-hosted AI platform with Open WebUI, LiteLLM, and Ollama using Docker Compose. Supports both CPU-only (Docker Ollama) and GPU-accelerated (Native Mac Ollama) modes with easy switching.

## 🚀 Quick Start

Get your AI platform running in under 2 minutes:

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env if needed (defaults work fine)

# 3. Start the platform
npm run init

# 4. Access the web interface
# Open http://localhost:3000 in your browser
# Login with: admin@example.com / admin_password123
```

**Expected Duration:**
- Service startup: ~30 seconds
- Model download: 5-10 minutes (first time only)
- Total: ~10 minutes

## 📋 Prerequisites

- **Docker Desktop** - [Download here](https://www.docker.com/products/docker-desktop/)
- **Node.js 18+** - [Download here](https://nodejs.org/)
- For GPU acceleration (Option B): **Ollama for Mac** - [Download here](https://ollama.com/)

## 🏗️ Architecture

```
┌─────────────┐      ┌──────────────┐      ┌──────────────┐
│  Browser    │─────▶│  Open WebUI  │─────▶│   LiteLLM    │
│  :3000      │      │  (Port 8080) │      │   Gateway    │
│             │      │              │      │   :4000      │
└─────────────┘      └──────────────┘      └──────┬───────┘
                                                   │
                                                   ▼
                          ┌───────────────────────────────────┐
                          │  Option A: Docker Ollama :11434   │
                          │          or                       │
                          │  Option B: Native Ollama :11434   │
                          └───────────────────────────────────┘
```

### Core Services

1. **Open WebUI** - ChatGPT-like interface with session history
2. **LiteLLM** - API Gateway with key management and rate limiting
3. **Ollama** - Inference engine (Dockerized or Native)

## ⚙️ Configuration

### Environment Variables

Edit `.env` to customize your platform:

```env
# LiteLLM Configuration
LITELLM_MASTER_KEY=sk-admin-master-secret  # Admin master key
LITELLM_PORT=4000                          # Gateway port

# Open WebUI Configuration
WEBUI_PORT=3000                            # Web UI port
WEBUI_ADMIN_EMAIL=admin@example.com        # Admin email
WEBUI_ADMIN_PASSWORD=admin_password123     # Admin password
ENABLE_SIGNUP=false                         # Allow new user signup
WEBUI_AUTH=true                            # Enable authentication

# Ollama Configuration
OLLAMA_PORT=11434                          # Ollama API port
OLLAMA_MODE=docker                         # 'docker' or 'native'
# For native mode: Install Ollama.app and run: launchctl setenv OLLAMA_HOST "0.0.0.0"

# Model Configuration
DEFAULT_MODEL=llama3                       # Default model to use
```

### Switching Between Option A and B

**Option A: Docker Ollama (CPU-only, Self-contained)**
- Default mode
- No additional setup required
- CPU-only inference (slower)
- Isolated in Docker container

**Option B: Native Ollama (GPU-accelerated, Faster)**
- Requires Ollama for Mac
- 3-5x faster inference
- Uses Mac GPU acceleration

**To switch from Docker to Native:**

```bash
# 1. Install Ollama for Mac
brew install ollama  # or download from ollama.com

# 2. Configure Ollama to listen on all interfaces
launchctl setenv OLLAMA_HOST "0.0.0.0"

# 3. Restart Ollama app completely (Quit + Reopen)

# 4. Pull model locally
ollama pull llama3

# 5. Update .env
echo "OLLAMA_MODE=native" >> .env

# 6. Restart platform
npm run teardown && npm run init
```

**To switch from Native to Docker:**

```bash
# 1. Update .env
echo "OLLAMA_MODE=docker" >> .env

# 2. Restart platform
npm run teardown && npm run init
```

## 🛠️ Usage

### Web UI

1. Open http://localhost:3000
2. Login with credentials from `.env`
3. Select a model (default: llama3)
4. Start chatting!

### API Key Generation

Generate API keys for programmatic access:

```bash
npm run gen-key
# Or with a custom username
npm run gen-key john_doe
```

Example output:
```
🔑 Generating API Key...

✅ API Key Generated!

═══════════════════════════════════════════════
🗝️  API Key:  sk-abc123...
👤 User:     john_doe
🤖 Model:    llama3
───────────────────────────────────────────────
📡 Endpoint: http://localhost:4000/v1
═══════════════════════════════════════════════
```

### API Usage

**Using curl:**

```bash
curl http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'
```

**Using Python:**

```python
import requests

response = requests.post(
    'http://localhost:4000/v1/chat/completions',
    headers={
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json'
    },
    json={
        'model': 'llama3',
        'messages': [
            {'role': 'user', 'content': 'Hello!'}
        ]
    }
)

print(response.json())
```

**Using Node.js:**

```javascript
const response = await fetch('http://localhost:4000/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'llama3',
    messages: [
      { role: 'user', content: 'Hello!' }
    ]
  })
});

const data = await response.json();
console.log(data);
```

### Health Check

Verify all services are operational:

```bash
npm run health
```

Expected output:
```
🏥 Health Check Report

Checking Docker...
Checking containers...
Checking endpoints...

═══════════════════════════════════════════════
✅ Docker Daemon: healthy
✅ ai-ollama: healthy
✅ ai-gateway: healthy
✅ ai-webui: healthy
✅ Ollama API: healthy
✅ LiteLLM API: healthy
✅ Web UI: healthy
═══════════════════════════════════════════════

✅ All systems operational!
```

### Stop the Platform

Stop all services while preserving data:

```bash
npm run teardown
```

Stop and remove all data (including chat history and models):

```bash
npm run teardown -- --volumes
```

## 📊 Performance

### Option A (Docker - CPU Only)
- Model: Llama3 8B
- Tokens/second: 5-15 on M1 Pro/Max
- First response: 2-5 seconds
- Memory usage: 6-8GB

### Option B (Native - GPU Accelerated)
- Model: Llama3 8B
- Tokens/second: 20-50 on M1 Pro/Max
- First response: 0.5-2 seconds
- Memory usage: 8-10GB (GPU + system)
- **3-5x faster than Option A**

## 🔧 Troubleshooting

### Issue: "Docker is not running"
**Solution:** Start Docker Desktop and wait for it to fully initialize

### Issue: Port already in use
**Solution:** Change ports in `.env`:
```env
WEBUI_PORT=3001
LITELLM_PORT=4001
OLLAMA_PORT=11435
```

### Issue: Model download fails
**Solution:**
- Check internet connection
- Verify disk space (need ~10GB free)
- Retry: `docker exec ai-ollama ollama pull llama3`

### Issue: LiteLLM can't reach Ollama (Option B)
**Solution:**
- Verify `OLLAMA_HOST=0.0.0.0` is set
- Restart Ollama app completely
- Test: `curl http://localhost:11434/api/version`
- Check from container: `docker exec ai-gateway curl http://host.docker.internal:11434`

### Issue: Services fail health check
**Solution:**
```bash
# Check logs
docker compose logs

# Restart individual service
docker restart ai-gateway

# Full restart
npm run teardown && npm run init
```

## 🔒 Security Considerations

### For POC/Development (Current Setup)
- Default credentials in `.env.example`
- Master key for admin access
- No HTTPS (localhost only)

### For Production (Recommended Changes)
1. Generate strong random keys
2. Enable HTTPS with reverse proxy (Caddy/Nginx)
3. Use Docker secrets or external secret manager
4. Enable rate limiting per user
5. Regular security updates: `docker compose pull`
6. Network isolation (Docker networks)
7. Monitor usage via LiteLLM admin UI

## 📁 Project Structure

```
minimal-ai-paas/
├── Configuration
│   ├── .env                      # Runtime config (git-ignored)
│   ├── .env.example             # Template
│   └── docker-compose.yml       # Service orchestration
│
├── LiteLLM Gateway
│   └── litellm/config.yaml      # Model routing
│
├── TypeScript Scripts (zx)
│   ├── scripts/utils.ts         # Shared utilities
│   ├── scripts/init.ts          # Setup & start
│   ├── scripts/generate-key.ts  # API key generation
│   ├── scripts/health-check.ts  # Service verification
│   └── scripts/teardown.ts      # Clean shutdown
│
├── Data (auto-created, git-ignored)
│   ├── ollama/                  # Model storage (~5GB)
│   └── openwebui/               # Chat history & users
│
└── Documentation
    ├── README.md                # This file
    └── plans/poc-spec.md        # Original specification
```

## 🎯 Next Steps

1. **Test thoroughly** - Run all verification steps
2. **Explore Web UI** - Create conversations, test different prompts
3. **Try API integration** - Build a simple Python/Node.js app
4. **Experiment with models** - Add llama3.2, mistral, codellama
5. **Performance tune** - Switch to Option B for GPU acceleration
6. **Multi-user setup** - Create API keys for team members
7. **Production prep** - Implement security recommendations

## 📚 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run init` | Initialize and start the platform |
| `npm run health` | Check health of all services |
| `npm run teardown` | Stop all services |
| `npm run gen-key` | Generate a new API key |

## 🤝 Contributing

This is a POC project. Feel free to extend and adapt it for your needs!

## 📄 License

MIT License - feel free to use this project for any purpose.

## 🙏 Acknowledgments

- [Open WebUI](https://openwebui.com/) - Chat interface
- [LiteLLM](https://docs.litellm.ai/) - API Gateway
- [Ollama](https://ollama.com/) - Inference engine
- [zx](https://github.com/google/zx) - Shell scripting in JavaScript
