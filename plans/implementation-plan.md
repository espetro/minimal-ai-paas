# Implementation Plan: Minimal AI Platform

## Overview

Build a self-hosted AI platform with Open WebUI, LiteLLM, and Ollama using Docker Compose. The platform will support both CPU-only (Docker Ollama) and GPU-accelerated (Native Mac Ollama) modes with easy switching.

**Key Requirements:**
- Enhanced implementation with documentation and tooling
- TypeScript scripts using `zx` for cross-platform support
- Environment variables for configuration (`.env` file)
- Default to Option A (Docker Ollama)
- Keep scripts lean (<150-200 LOC each)

## Architecture

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

**Three Core Services:**
1. **Open WebUI** - ChatGPT-like interface with session history
2. **LiteLLM** - API Gateway with key management and rate limiting
3. **Ollama** - Inference engine (Dockerized or Native)

## Directory Structure

```
minimal-ai-paas/
├── .env                          # Environment configuration (git-ignored)
├── .env.example                  # Template with all required variables
├── .gitignore                    # Exclude secrets and data
├── docker-compose.yml            # Service orchestration
├── README.md                     # Comprehensive documentation
├── package.json                  # Node dependencies (zx, @types/node)
├── tsconfig.json                 # TypeScript configuration
├── litellm/
│   └── config.yaml              # LiteLLM routing configuration
├── scripts/
│   ├── init.ts                  # Main initialization script
│   ├── health-check.ts          # Service health verification
│   ├── teardown.ts              # Clean shutdown
│   ├── generate-key.ts          # API key generation utility
│   └── utils.ts                 # Shared utilities
└── plans/
    └── poc-spec.md              # Original specification
```

## Implementation Steps

### Phase 1: Project Foundation

#### 1.1 Create Package Configuration

**File:** `package.json`

```json
{
  "name": "minimal-ai-paas",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "init": "tsx scripts/init.ts",
    "health": "tsx scripts/health-check.ts",
    "teardown": "tsx scripts/teardown.ts",
    "gen-key": "tsx scripts/generate-key.ts"
  },
  "dependencies": {
    "zx": "^8.2.4",
    "tsx": "^4.19.2"
  },
  "devDependencies": {
    "@types/node": "^22.10.5",
    "typescript": "^5.7.3"
  }
}
```

**Purpose:**
- `zx` - Shell scripting in TypeScript with cross-platform support
- `tsx` - Fast TypeScript execution without compilation step
- Scripts defined for easy CLI usage: `npm run init`, `npm run health`, etc.

#### 1.2 Create TypeScript Configuration

**File:** `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "types": ["node"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["scripts/**/*"],
  "exclude": ["node_modules"]
}
```

**Purpose:**
- Modern ES2022 features
- Strict type checking
- Node.js type definitions

#### 1.3 Create Environment Template

**File:** `.env.example`

```env
# LiteLLM Configuration
LITELLM_MASTER_KEY=sk-admin-master-secret
LITELLM_PORT=4000

# Open WebUI Configuration
WEBUI_PORT=3000
WEBUI_ADMIN_EMAIL=admin@example.com
WEBUI_ADMIN_PASSWORD=admin_password123
ENABLE_SIGNUP=false
WEBUI_AUTH=true

# Ollama Configuration
OLLAMA_PORT=11434
OLLAMA_MODE=docker
# Options: 'docker' (CPU-only) or 'native' (GPU-accelerated)
# For native mode: Install Ollama.app and run: launchctl setenv OLLAMA_HOST "0.0.0.0"

# Model Configuration
DEFAULT_MODEL=llama3
```

**Key Features:**
- All secrets externalized
- Clear documentation in comments
- OLLAMA_MODE flag for easy switching between Option A/B
- Production-ready pattern

#### 1.4 Create .gitignore

**File:** `.gitignore`

```gitignore
# Environment and secrets
.env

# Data directories (auto-created by Docker)
ollama/
openwebui/

# Node.js
node_modules/
*.log

# System files
.DS_Store
.vscode/
.idea/

# TypeScript build artifacts
dist/
build/
*.tsbuildinfo
```

**Purpose:**
- Prevent committing secrets and sensitive data
- Exclude large model files (~5GB in ollama/)
- Ignore IDE and system files

### Phase 2: Core Configuration Files

#### 2.1 Create LiteLLM Configuration

**File:** `litellm/config.yaml`

**Content:**
```yaml
model_list:
  - model_name: ${DEFAULT_MODEL}
    litellm_params:
      model: ollama/${DEFAULT_MODEL}
      # Routes to docker container when OLLAMA_MODE=docker
      # Routes to host machine when OLLAMA_MODE=native
      api_base: ${OLLAMA_API_BASE}

general_settings:
  master_key: ${LITELLM_MASTER_KEY}
```

**Key Decision:** Use environment variable placeholders
- `${DEFAULT_MODEL}` - Makes it easy to switch models
- `${OLLAMA_API_BASE}` - Dynamic routing based on OLLAMA_MODE
- `${LITELLM_MASTER_KEY}` - Never hardcode secrets

**Note:** The init script will need to substitute these variables before starting services.

#### 2.2 Create Docker Compose Configuration

**File:** `docker-compose.yml`

**Content:**
```yaml
services:
  # Service 1: Inference Engine (Option A - Docker/CPU)
  # This service is started conditionally based on OLLAMA_MODE
  ollama:
    image: ollama/ollama:latest
    container_name: ai-ollama
    volumes:
      - ./ollama:/root/.ollama
    ports:
      - "${OLLAMA_PORT}:11434"
    restart: always
    profiles:
      - docker-mode  # Only starts when explicitly activated

  # Service 2: AI Gateway (API Key Manager & Rate Limiter)
  litellm:
    image: ghcr.io/berriai/litellm:main-latest
    container_name: ai-gateway
    ports:
      - "${LITELLM_PORT}:4000"
    volumes:
      - ./litellm/config.yaml:/app/config.yaml
    command:
      - "--config"
      - "/app/config.yaml"
      - "--port"
      - "4000"
      - "--detailed_debug"
    environment:
      LITELLM_MASTER_KEY: ${LITELLM_MASTER_KEY}
      DEFAULT_MODEL: ${DEFAULT_MODEL}
      OLLAMA_API_BASE: ${OLLAMA_API_BASE}
    extra_hosts:
      - "host.docker.internal:host-gateway"
    restart: always

  # Service 3: Web UI (Chat Interface)
  open-webui:
    image: ghcr.io/open-webui/open-webui:main
    container_name: ai-webui
    ports:
      - "${WEBUI_PORT}:8080"
    environment:
      OPENAI_API_BASE_URL: "http://litellm:4000/v1"
      OPENAI_API_KEY: ${LITELLM_MASTER_KEY}
      WEBUI_ADMIN_EMAIL: ${WEBUI_ADMIN_EMAIL}
      WEBUI_ADMIN_PASSWORD: ${WEBUI_ADMIN_PASSWORD}
      ENABLE_SIGNUP: ${ENABLE_SIGNUP}
      WEBUI_AUTH: ${WEBUI_AUTH}
    volumes:
      - ./openwebui:/app/backend/data
    depends_on:
      - litellm
    restart: always
```

**Key Features:**
- Uses Docker Compose profiles to conditionally start ollama service
- All configuration from environment variables
- `extra_hosts` enables Option B (native) connectivity
- Proper service dependencies

### Phase 3: TypeScript Scripts

#### 3.1 Shared Utilities

**File:** `scripts/utils.ts`

**Purpose:** Shared utilities to keep other scripts lean

```typescript
#!/usr/bin/env tsx
import { $, sleep } from 'zx';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Quiet mode by default (no command echo)
$.verbose = false;

/**
 * Load and parse .env file
 */
export function loadEnv(): Record<string, string> {
  const envPath = join(process.cwd(), '.env');
  try {
    const content = readFileSync(envPath, 'utf-8');
    return Object.fromEntries(
      content
        .split('\n')
        .filter(line => line && !line.startsWith('#'))
        .map(line => line.split('='))
        .filter(([key]) => key)
    );
  } catch (error) {
    console.error('❌ Error: .env file not found. Copy .env.example to .env first.');
    process.exit(1);
  }
}

/**
 * Check if Docker is running
 */
export async function checkDocker(): Promise<boolean> {
  try {
    await $`docker info`;
    return true;
  } catch {
    console.error('❌ Docker is not running. Please start Docker Desktop.');
    return false;
  }
}

/**
 * Wait for service to be ready
 */
export async function waitForService(
  url: string,
  maxAttempts = 30,
  delayMs = 2000
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await $`curl -sf ${url}`;
      return true;
    } catch {
      await sleep(delayMs);
    }
  }
  return false;
}

/**
 * Replace environment variables in config file
 */
export function substituteEnvVars(templatePath: string, env: Record<string, string>): void {
  let content = readFileSync(templatePath, 'utf-8');

  for (const [key, value] of Object.entries(env)) {
    content = content.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value);
  }

  writeFileSync(templatePath, content, 'utf-8');
}

/**
 * Calculate OLLAMA_API_BASE from OLLAMA_MODE
 */
export function getOllamaApiBase(mode: string, port: string): string {
  return mode === 'native'
    ? `http://host.docker.internal:${port}`
    : `http://ollama:${port}`;
}
```

**Key Features:**
- ~100 LOC - stays lean
- Reusable functions for common operations
- Environment loading with validation
- Service health checking
- Template variable substitution

#### 3.2 Initialization Script

**File:** `scripts/init.ts`

```typescript
#!/usr/bin/env tsx
import { $, chalk } from 'zx';
import { loadEnv, checkDocker, waitForService, substituteEnvVars, getOllamaApiBase } from './utils.ts';

async function main() {
  console.log(chalk.blue('🚀 Starting AI Platform...\n'));

  // Step 1: Validate environment
  const env = loadEnv();
  if (!(await checkDocker())) {
    process.exit(1);
  }

  // Step 2: Calculate Ollama API base
  const ollamaMode = env.OLLAMA_MODE || 'docker';
  const ollamaPort = env.OLLAMA_PORT || '11434';
  const ollamaApiBase = getOllamaApiBase(ollamaMode, ollamaPort);

  // Add to env for docker-compose
  process.env.OLLAMA_API_BASE = ollamaApiBase;
  Object.assign(process.env, env);

  // Step 3: Substitute variables in litellm config
  console.log('📝 Configuring LiteLLM...');
  substituteEnvVars('./litellm/config.yaml', {
    ...env,
    OLLAMA_API_BASE: ollamaApiBase
  });

  // Step 4: Start services
  console.log('🐳 Starting Docker services...\n');
  const profile = ollamaMode === 'docker' ? '--profile docker-mode' : '';
  await $`docker compose ${profile} up -d`;

  // Step 5: Pull model if using Docker Ollama
  if (ollamaMode === 'docker') {
    console.log('\n⏳ Waiting for Ollama to initialize...');
    await waitForService(`http://localhost:${ollamaPort}`, 20, 3000);

    console.log(`📥 Pulling ${env.DEFAULT_MODEL} model (this may take 5-10 minutes)...`);
    await $`docker exec ai-ollama ollama pull ${env.DEFAULT_MODEL}`;
  } else {
    console.log(chalk.yellow('\n⚠️  Using Native Ollama (Option B)'));
    console.log(chalk.yellow('   Make sure you have run: ollama pull ${env.DEFAULT_MODEL}'));
  }

  // Step 6: Wait for services
  console.log('\n⏳ Waiting for services to be ready...');
  const litellmReady = await waitForService(`http://localhost:${env.LITELLM_PORT}/health`);
  const webuiReady = await waitForService(`http://localhost:${env.WEBUI_PORT}`);

  if (!litellmReady || !webuiReady) {
    console.error('❌ Services failed to start. Check logs: docker compose logs');
    process.exit(1);
  }

  // Step 7: Print success message
  console.log(chalk.green('\n✅ Setup Complete!\n'));
  console.log('═══════════════════════════════════════════════');
  console.log(`🖥️  Web UI:        http://localhost:${env.WEBUI_PORT}`);
  console.log(`   Login:         ${env.WEBUI_ADMIN_EMAIL} / ${env.WEBUI_ADMIN_PASSWORD}`);
  console.log('───────────────────────────────────────────────');
  console.log(`🛡️  Admin Gateway: http://localhost:${env.LITELLM_PORT}/ui`);
  console.log(`   Master Key:    ${env.LITELLM_MASTER_KEY}`);
  console.log('───────────────────────────────────────────────');
  console.log('💡 To generate API keys, run: npm run gen-key');
  console.log('═══════════════════════════════════════════════');
}

main().catch(error => {
  console.error(chalk.red('❌ Fatal error:'), error.message);
  process.exit(1);
});
```

**Key Features:**
- ~85 LOC - lean and focused
- Intelligent mode detection (docker vs native)
- Proper error handling
- Service health validation
- User-friendly output with colors

#### 3.3 API Key Generation Script

**File:** `scripts/generate-key.ts`

```typescript
#!/usr/bin/env tsx
import { $, chalk } from 'zx';
import { loadEnv } from './utils.ts';

async function main() {
  const env = loadEnv();
  const litellmPort = env.LITELLM_PORT || '4000';
  const masterKey = env.LITELLM_MASTER_KEY;
  const model = env.DEFAULT_MODEL || 'llama3';

  console.log(chalk.blue('🔑 Generating API Key...\n'));

  const username = process.argv[2] || 'sample_user';

  try {
    const response = await fetch(`http://localhost:${litellmPort}/key/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${masterKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        models: [model],
        duration: null,
        metadata: { user: username }
      })
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const userKey = data.key;

    console.log(chalk.green('✅ API Key Generated!\n'));
    console.log('═══════════════════════════════════════════════');
    console.log(`🗝️  API Key:  ${userKey}`);
    console.log(`👤 User:     ${username}`);
    console.log(`🤖 Model:    ${model}`);
    console.log('───────────────────────────────────────────────');
    console.log(`📡 Endpoint: http://localhost:${litellmPort}/v1`);
    console.log('═══════════════════════════════════════════════');

    console.log('\n📋 Example Usage (curl):');
    console.log(`curl http://localhost:${litellmPort}/v1/chat/completions \\`);
    console.log(`  -H "Authorization: Bearer ${userKey}" \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -d '{"model":"${model}","messages":[{"role":"user","content":"Hello!"}]}'`);

  } catch (error: any) {
    console.error(chalk.red('❌ Failed to generate key:'), error.message);
    console.error(chalk.yellow('\n💡 Make sure the platform is running: npm run init'));
    process.exit(1);
  }
}

main();
```

**Key Features:**
- ~65 LOC - single purpose, lean
- Uses modern fetch API
- Provides usage examples
- Proper error handling
- Accepts username as argument: `npm run gen-key john_doe`

#### 3.4 Health Check Script

**File:** `scripts/health-check.ts`

```typescript
#!/usr/bin/env tsx
import { $, chalk } from 'zx';
import { loadEnv, waitForService } from './utils.ts';

$.verbose = false;

interface HealthStatus {
  service: string;
  status: 'healthy' | 'unhealthy' | 'not-running';
  details?: string;
}

async function checkContainerHealth(containerName: string): Promise<HealthStatus> {
  try {
    await $`docker inspect ${containerName}`;
    const isRunning = (await $`docker ps -q -f name=${containerName}`).stdout.trim();

    if (!isRunning) {
      return { service: containerName, status: 'not-running' };
    }

    return { service: containerName, status: 'healthy' };
  } catch {
    return { service: containerName, status: 'not-running' };
  }
}

async function checkEndpoint(url: string, name: string): Promise<HealthStatus> {
  const isHealthy = await waitForService(url, 3, 1000);
  return {
    service: name,
    status: isHealthy ? 'healthy' : 'unhealthy',
    details: isHealthy ? url : `Failed to reach ${url}`
  };
}

async function main() {
  console.log(chalk.blue('🏥 Health Check Report\n'));

  const env = loadEnv();
  const results: HealthStatus[] = [];

  // Check Docker
  console.log('Checking Docker...');
  try {
    await $`docker info`;
    results.push({ service: 'Docker Daemon', status: 'healthy' });
  } catch {
    results.push({ service: 'Docker Daemon', status: 'unhealthy', details: 'Not running' });
  }

  // Check containers
  console.log('Checking containers...');
  const ollamaMode = env.OLLAMA_MODE || 'docker';

  if (ollamaMode === 'docker') {
    results.push(await checkContainerHealth('ai-ollama'));
  }
  results.push(await checkContainerHealth('ai-gateway'));
  results.push(await checkContainerHealth('ai-webui'));

  // Check endpoints
  console.log('Checking endpoints...');
  const litellmPort = env.LITELLM_PORT || '4000';
  const webuiPort = env.WEBUI_PORT || '3000';
  const ollamaPort = env.OLLAMA_PORT || '11434';

  if (ollamaMode === 'docker') {
    results.push(await checkEndpoint(`http://localhost:${ollamaPort}`, 'Ollama API'));
  }
  results.push(await checkEndpoint(`http://localhost:${litellmPort}/health`, 'LiteLLM API'));
  results.push(await checkEndpoint(`http://localhost:${webuiPort}`, 'Web UI'));

  // Display results
  console.log('\n═══════════════════════════════════════════════');
  for (const result of results) {
    const icon = result.status === 'healthy' ? '✅' : '❌';
    const color = result.status === 'healthy' ? chalk.green : chalk.red;
    console.log(color(`${icon} ${result.service}: ${result.status}`));
    if (result.details) {
      console.log(chalk.gray(`   ${result.details}`));
    }
  }
  console.log('═══════════════════════════════════════════════');

  const allHealthy = results.every(r => r.status === 'healthy');
  if (!allHealthy) {
    console.log(chalk.yellow('\n💡 Troubleshooting:'));
    console.log('   - Check logs: docker compose logs');
    console.log('   - Restart platform: npm run teardown && npm run init');
    process.exit(1);
  } else {
    console.log(chalk.green('\n✅ All systems operational!'));
  }
}

main();
```

**Key Features:**
- ~95 LOC - comprehensive but lean
- Checks Docker, containers, and endpoints
- Mode-aware (skips Ollama checks in native mode)
- Provides troubleshooting guidance
- Exit code indicates overall health

#### 3.5 Teardown Script

**File:** `scripts/teardown.ts`

```typescript
#!/usr/bin/env tsx
import { $, chalk } from 'zx';

async function main() {
  console.log(chalk.blue('🛑 Stopping AI Platform...\n'));

  try {
    // Stop all services
    await $`docker compose down`;
    console.log(chalk.green('✅ All services stopped'));

    // Optional: Remove volumes (uncomment to enable)
    const removeVolumes = process.argv.includes('--volumes');
    if (removeVolumes) {
      console.log(chalk.yellow('\n⚠️  Removing data volumes...'));
      await $`docker compose down -v`;
      console.log(chalk.yellow('   All chat history and models deleted'));
    } else {
      console.log(chalk.gray('\n💡 Data preserved. To remove all data, run: npm run teardown -- --volumes'));
    }

  } catch (error: any) {
    console.error(chalk.red('❌ Error during teardown:'), error.message);
    process.exit(1);
  }
}

main();
```

**Key Features:**
- ~30 LOC - minimal and focused
- Optional volume removal via flag
- Safe by default (preserves data)
- Clear user guidance

### Phase 4: Documentation

#### 4.1 Create Comprehensive README

**File:** `README.md`

**Structure:**
- Quick Start (< 2 minutes to running)
- Architecture Overview
- Configuration Guide
- Usage Examples (Web UI, API, Python/Node.js)
- Switching from Option A to Option B
- Troubleshooting
- Security Best Practices

**Length:** ~300 lines (detailed documentation is essential)

**Key Sections:**
1. Prerequisites (Docker Desktop, Node.js 18+)
2. Installation steps
3. Service URLs and credentials
4. API key generation
5. Option A vs B comparison
6. Common issues and solutions
7. Production deployment notes

### Phase 5: Installation & Verification

#### 5.1 Install Dependencies

```bash
npm install
```

Installs: `zx`, `tsx`, `@types/node`, `typescript`

#### 5.2 Environment Setup

```bash
cp .env.example .env
# Edit .env if needed (defaults work fine)
```

#### 5.3 Initialize Platform

```bash
npm run init
```

**Expected Duration:**
- Service startup: ~30 seconds
- Model download: 5-10 minutes (first time only)
- Total: ~10 minutes

#### 5.4 Generate API Key

```bash
npm run gen-key
```

Outputs a user API key for programmatic access

#### 5.5 Health Check

```bash
npm run health
```

Verifies all services are operational

## Critical Files

These files must be created in order and are essential for the platform:

1. **`package.json`** - Defines dependencies and scripts
2. **`tsconfig.json`** - TypeScript configuration
3. **`.env.example`** - Configuration template
4. **`.gitignore`** - Prevents committing secrets
5. **`litellm/config.yaml`** - LiteLLM routing (with env var placeholders)
6. **`docker-compose.yml`** - Service orchestration
7. **`scripts/utils.ts`** - Shared utilities (create first!)
8. **`scripts/init.ts`** - Main initialization
9. **`scripts/generate-key.ts`** - API key generation
10. **`scripts/health-check.ts`** - Health verification
11. **`scripts/teardown.ts`** - Clean shutdown
12. **`README.md`** - User documentation

## Verification Steps

### Test 1: Structural Validation
```bash
# Check directory structure
tree -L 2 -I node_modules

# Validate docker-compose syntax
docker compose config

# Check TypeScript compilation
npx tsc --noEmit
```

### Test 2: Service Startup (Option A - Docker)
```bash
# Start platform
npm run init

# Verify containers running
docker ps
# Expected: ai-ollama, ai-gateway, ai-webui

# Check logs for errors
docker compose logs --tail=50
```

### Test 3: Model Availability
```bash
# List models in Ollama
docker exec ai-ollama ollama list
# Expected: llama3

# Test direct inference
docker exec ai-ollama ollama run llama3 "What is 2+2?"
```

### Test 4: API Gateway
```bash
# Check LiteLLM health
curl http://localhost:4000/health

# Generate API key
npm run gen-key test_user

# Test inference with key
curl http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer <KEY_FROM_ABOVE>" \
  -H "Content-Type: application/json" \
  -d '{"model":"llama3","messages":[{"role":"user","content":"Hello!"}]}'
```

### Test 5: Web UI
1. Open http://localhost:3000
2. Login with credentials from .env
3. Select "llama3" model
4. Send message: "What is 2+2?"
5. Verify response generated
6. Refresh page, verify chat history persists

### Test 6: Health Check
```bash
npm run health
# Expected: All systems operational
```

### Test 7: Option B Migration (GPU Acceleration)
```bash
# Stop current setup
npm run teardown

# Install Ollama for Mac
brew install ollama  # or download from ollama.com

# Configure Ollama to listen on all interfaces
launchctl setenv OLLAMA_HOST "0.0.0.0"

# Restart Ollama app completely (Quit + Reopen)

# Pull model locally
ollama pull llama3

# Update .env
echo "OLLAMA_MODE=native" >> .env

# Restart platform
npm run init

# Verify using native Ollama
docker ps
# Expected: ai-gateway, ai-webui (NO ai-ollama)

# Test performance (should be 3-5x faster)
time curl http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer <KEY>" \
  -H "Content-Type: application/json" \
  -d '{"model":"llama3","messages":[{"role":"user","content":"Write a haiku"}]}'
```

### Test 8: Persistence
```bash
# Create test data
# Send some chat messages via Web UI

# Stop platform
npm run teardown

# Restart
npm run init

# Verify chat history persists
# Login to Web UI and check conversations
```

### Test 9: Clean Teardown
```bash
# Stop without removing data
npm run teardown

# Stop and remove all data
npm run teardown -- --volumes

# Verify clean state
docker ps
docker volume ls | grep minimal-ai-paas
```

## Configuration Options

### OLLAMA_MODE
- `docker` (default): Dockerized Ollama, CPU-only, self-contained
- `native`: Native Mac app, GPU-accelerated, requires setup

### Switching Modes

**From Docker to Native:**
1. Install Ollama for Mac
2. Configure: `launchctl setenv OLLAMA_HOST "0.0.0.0"`
3. Pull model: `ollama pull llama3`
4. Update `.env`: `OLLAMA_MODE=native`
5. Restart: `npm run teardown && npm run init`

**From Native to Docker:**
1. Update `.env`: `OLLAMA_MODE=docker`
2. Restart: `npm run teardown && npm run init`

## Troubleshooting

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

## Performance Expectations

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

## Security Considerations

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

## Project Structure Explained

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

## Next Steps After Implementation

1. **Test thoroughly** - Run all verification steps
2. **Explore Web UI** - Create conversations, test different prompts
3. **Try API integration** - Build a simple Python/Node.js app
4. **Experiment with models** - Add llama3.2, mistral, codellama
5. **Performance tune** - Switch to Option B for GPU acceleration
6. **Multi-user setup** - Create API keys for team members
7. **Production prep** - Implement security recommendations

## Implementation Time Estimate

- **File creation**: 30-45 minutes
- **Testing & debugging**: 15-30 minutes
- **Documentation**: 20-30 minutes
- **Total**: 1-2 hours (excluding model download time)

## Success Criteria

✅ All services start without errors
✅ Model downloads successfully
✅ Web UI loads and responds to prompts
✅ API key generation works
✅ Health check passes
✅ Chat history persists across restarts
✅ Easy switch between Option A and B
✅ Clean teardown with data preservation option
✅ Clear documentation for troubleshooting
