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
  delayMs = 2000,
  headers?: string[]
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const headerArgs = headers ? headers.flatMap(h => ['-H', h]) : [];
      await $`curl -sf ${headerArgs} ${url}`;
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
