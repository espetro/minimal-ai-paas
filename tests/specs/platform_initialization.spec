# Platform Initialization

This specification covers the initialization of the AI Platform including starting all services and pulling required models.

## Environment Setup
* Create environment file from template
* Configure LFM2.5 model as default

## Start Platform
* Start Docker services with "npm run init"
* Wait for all containers to be running
* Verify Ollama container is healthy
* Verify LiteLLM gateway is healthy
* Verify Open WebUI is healthy

## Model Availability
* Verify model "hf.co/LiquidAI/LFM2-1.2B-GGUF:Q4_K_M" is available in Ollama
* Check model size is approximately "730 MB"
