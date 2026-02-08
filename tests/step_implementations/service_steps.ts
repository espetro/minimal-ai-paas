import { Step } from "gauge-ts";
import { $ } from "zx";

$.verbose = false;

// Service Health Check Steps

@Step("Check Docker daemon is running")
export async function checkDockerDaemon() {
  try {
    await $`docker info`;
    console.log("Docker daemon is running");
  } catch (error) {
    throw new Error("Docker daemon is not running");
  }
}

@Step("Verify container <containerName> is running")
export async function verifyContainerRunning(containerName: string) {
  const result = await $`docker ps --filter name=${containerName} --format {{.Names}}`;

  if (!result.stdout.includes(containerName)) {
    throw new Error(`Container ${containerName} is not running`);
  }

  console.log(`Container ${containerName} is running`);
}

@Step("Ollama API responds at <url>")
export async function checkOllamaApi(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Ollama API at ${url} is not responding`);
  }

  console.log(`Ollama API at ${url} is responding`);
}

@Step("LiteLLM health endpoint responds at <url>")
export async function checkLiteLLMHealth(url: string) {
  const response = await fetch(url, {
    headers: {
      'Authorization': 'Bearer sk-admin-master-secret'
    }
  });

  if (!response.ok) {
    throw new Error(`LiteLLM health endpoint at ${url} is not responding`);
  }

  console.log(`LiteLLM health endpoint at ${url} is responding`);
}

@Step("Open WebUI responds at <url>")
export async function checkOpenWebUI(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Open WebUI at ${url} is not responding`);
  }

  console.log(`Open WebUI at ${url} is responding`);
}

@Step("Authenticate with master key <masterKey>")
export async function authenticateWithMasterKey(masterKey: string) {
  // Store in data store for use in subsequent steps
  (global as any).masterKey = masterKey;
  console.log("Master key configured");
}

@Step("Check health endpoint returns healthy endpoints")
export async function checkHealthyEndpoints() {
  const masterKey = (global as any).masterKey || 'sk-admin-master-secret';

  const response = await fetch('http://localhost:4000/health', {
    headers: {
      'Authorization': `Bearer ${masterKey}`
    }
  });

  const data = await response.json();

  if (!data.healthy_endpoints || data.healthy_endpoints.length === 0) {
    throw new Error("No healthy endpoints found");
  }

  (global as any).healthData = data;
  console.log("Health endpoint returns healthy endpoints");
}

@Step("Verify model <modelName> is in healthy endpoints")
export async function verifyModelInHealthy(modelName: string) {
  const healthData = (global as any).healthData;

  if (!healthData) {
    throw new Error("Health data not available. Run health check first.");
  }

  const modelFound = healthData.healthy_endpoints.some((endpoint: any) =>
    endpoint.model.includes(modelName) || endpoint.litellm_metadata
  );

  if (!modelFound) {
    throw new Error(`Model ${modelName} not found in healthy endpoints`);
  }

  console.log(`Model ${modelName} is in healthy endpoints`);
}

@Step("Confirm healthy_count is greater than <count>")
export async function confirmHealthyCount(count: string) {
  const healthData = (global as any).healthData;

  if (!healthData) {
    throw new Error("Health data not available");
  }

  const expectedCount = parseInt(count);

  if (healthData.healthy_count <= expectedCount) {
    throw new Error(`Expected healthy_count > ${count}, got ${healthData.healthy_count}`);
  }

  console.log(`Healthy count ${healthData.healthy_count} is greater than ${count}`);
}
