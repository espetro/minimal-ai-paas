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
  if (ollamaMode === 'docker') {
    await $`docker compose --profile docker-mode up -d`;
  } else {
    await $`docker compose up -d`;
  }

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
  const litellmReady = await waitForService(
    `http://localhost:${env.LITELLM_PORT}/health`,
    30,
    2000,
    [`Authorization: Bearer ${env.LITELLM_MASTER_KEY}`]
  );
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
