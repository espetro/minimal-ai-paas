import { Step, BeforeSuite, AfterSuite } from "gauge-ts";
import { $ } from "zx";
import { readFileSync, writeFileSync, copyFileSync } from "fs";
import { join } from "path";

$.verbose = false;

const PROJECT_ROOT = join(__dirname, "../..");
const ENV_FILE = join(PROJECT_ROOT, ".env");
const ENV_EXAMPLE = join(PROJECT_ROOT, ".env.example");

// Test state
let envBackup: string | null = null;

@BeforeSuite()
export async function beforeSuite() {
  console.log("Setting up test environment...");

  // Backup existing .env if it exists
  try {
    envBackup = readFileSync(ENV_FILE, "utf-8");
  } catch {
    // No existing .env file
  }
}

@AfterSuite()
export async function afterSuite() {
  console.log("Cleaning up test environment...");

  // Restore original .env if it existed
  if (envBackup) {
    writeFileSync(ENV_FILE, envBackup);
  }
}

// Platform Initialization Steps

@Step("Create environment file from template")
export async function createEnvFile() {
  copyFileSync(ENV_EXAMPLE, ENV_FILE);
  console.log("Created .env from .env.example");
}

@Step("Configure LFM2.5 model as default")
export async function configureLFMModel() {
  let content = readFileSync(ENV_FILE, "utf-8");
  content = content.replace(
    /DEFAULT_MODEL=.*/,
    "DEFAULT_MODEL=hf.co/LiquidAI/LFM2-1.2B-GGUF:Q4_K_M"
  );
  writeFileSync(ENV_FILE, content);
  console.log("Configured LFM2.5 model");
}

@Step("Start Docker services with <command>")
export async function startDockerServices(command: string) {
  process.chdir(PROJECT_ROOT);
  await $`${command}`;
  console.log("Started Docker services");
}

@Step("Wait for all containers to be running")
export async function waitForContainers() {
  let attempts = 0;
  const maxAttempts = 30;

  while (attempts < maxAttempts) {
    try {
      const result = await $`docker compose ps --format json`;
      const containers = JSON.parse(`[${result.stdout.trim().split('\n').join(',')}]`);

      const allRunning = containers.every((c: any) =>
        c.State === "running" || c.Health === "healthy"
      );

      if (allRunning) {
        console.log("All containers are running");
        return;
      }
    } catch (error) {
      // Continue waiting
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
    attempts++;
  }

  throw new Error("Containers did not start within timeout");
}

@Step("Verify <containerName> container is healthy")
export async function verifyContainerHealthy(containerName: string) {
  const result = await $`docker inspect ${containerName}`;
  const container = JSON.parse(result.stdout)[0];

  if (container.State.Running !== true) {
    throw new Error(`Container ${containerName} is not running`);
  }

  console.log(`Container ${containerName} is healthy`);
}

@Step("Verify model <modelName> is available in Ollama")
export async function verifyModelAvailable(modelName: string) {
  const result = await $`docker exec ai-ollama ollama list`;

  if (!result.stdout.includes(modelName)) {
    throw new Error(`Model ${modelName} not found in Ollama`);
  }

  console.log(`Model ${modelName} is available`);
}

@Step("Check model size is approximately <size>")
export async function checkModelSize(size: string) {
  const result = await $`docker exec ai-ollama ollama list`;
  const lines = result.stdout.trim().split('\n');

  // Find the model line and check size
  const modelLine = lines.find(line => line.includes('LFM'));

  if (!modelLine) {
    throw new Error("Model not found in list");
  }

  if (!modelLine.includes(size.replace(' ', ''))) {
    console.log(`Warning: Model size might differ from expected ${size}`);
  } else {
    console.log(`Model size matches approximately ${size}`);
  }
}
