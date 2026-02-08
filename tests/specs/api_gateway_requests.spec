# API Gateway Requests

This specification tests API requests through the LiteLLM gateway using the master key.

## API Authentication
* Set master key to "sk-admin-master-secret"
* Configure model to "hf.co/LiquidAI/LFM2-1.2B-GGUF:Q4_K_M"
* Set API endpoint to "http://localhost:4000"

## Chat Completion Request
* Send chat completion request with message "Hello, how are you?"
* Response status code is "200"
* Response contains valid completion ID
* Response model matches requested model
* Response contains assistant message
* Response has usage statistics

## Model Parameters
* Send request with max_tokens "50"
* Response completion tokens is less than or equal to "50"
* Send request with temperature "0.7"
* Response is deterministic with temperature "0"

## Error Handling
* Send request without authorization header
* Response status code is "401"
* Send request with invalid model name "nonexistent-model"
* Response status code is "400" or "404"
