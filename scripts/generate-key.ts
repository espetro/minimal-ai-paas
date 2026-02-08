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
