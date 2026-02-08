# Service Health Checks

This specification tests the health and availability of all platform services.

## Docker Services Status
* Check Docker daemon is running
* Verify container "ai-ollama" is running
* Verify container "ai-gateway" is running
* Verify container "ai-webui" is running

## Service Endpoints
* Ollama API responds at "http://localhost:11434"
* LiteLLM health endpoint responds at "http://localhost:4000/health"
* Open WebUI responds at "http://localhost:3000"

## LiteLLM Gateway Health
* Authenticate with master key "sk-admin-master-secret"
* Check health endpoint returns healthy endpoints
* Verify model "hf.co/LiquidAI/LFM2-1.2B-GGUF:Q4_K_M" is in healthy endpoints
* Confirm healthy_count is greater than "0"
