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
