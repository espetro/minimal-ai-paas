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
