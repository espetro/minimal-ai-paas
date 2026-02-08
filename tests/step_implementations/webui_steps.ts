import { Step } from "gauge-ts";

// Web UI Functionality Steps

@Step("Open WebUI is accessible at <url>")
export async function checkWebUIAccessible(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Web UI at ${url} is not accessible`);
  }

  (global as any).webuiUrl = url;
  console.log(`Web UI is accessible at ${url}`);
}

@Step("Get Web UI configuration")
export async function getWebUIConfig() {
  const url = (global as any).webuiUrl || 'http://localhost:3000';

  const response = await fetch(`${url}/api/config`);

  if (!response.ok) {
    throw new Error("Failed to get Web UI configuration");
  }

  const config = await response.json();
  (global as any).webuiConfig = config;
  console.log("Retrieved Web UI configuration");
}

@Step("Verify authentication is enabled")
export async function verifyAuthEnabled() {
  const config = (global as any).webuiConfig;

  if (!config) {
    throw new Error("Web UI config not available");
  }

  if (!config.features?.auth) {
    throw new Error("Authentication is not enabled");
  }

  console.log("Authentication is enabled");
}

@Step("Verify signup is disabled")
export async function verifySignupDisabled() {
  const config = (global as any).webuiConfig;

  if (!config) {
    throw new Error("Web UI config not available");
  }

  if (config.features?.enable_signup) {
    throw new Error("Signup is not disabled");
  }

  console.log("Signup is disabled");
}

@Step("Login with email <email> and password <password>")
export async function loginWebUI(email: string, password: string) {
  const url = (global as any).webuiUrl || 'http://localhost:3000';

  const response = await fetch(`${url}/api/v1/auths/signin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    throw new Error(`Login failed with status ${response.status}`);
  }

  const data = await response.json();
  (global as any).authToken = data.token;
  console.log("Successfully logged in");
}

@Step("Receive valid JWT token")
export async function verifyJWTToken() {
  const token = (global as any).authToken;

  if (!token) {
    throw new Error("No authentication token received");
  }

  // Basic JWT format check (header.payload.signature)
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error("Invalid JWT token format");
  }

  console.log("Received valid JWT token");
}

@Step("Token is not empty")
export async function verifyTokenNotEmpty() {
  const token = (global as any).authToken;

  if (!token || token.trim().length === 0) {
    throw new Error("Token is empty");
  }

  console.log("Token is not empty");
}

@Step("Access Web UI home page returns status <statusCode>")
export async function checkHomePageStatus(statusCode: string) {
  const url = (global as any).webuiUrl || 'http://localhost:3000';

  const response = await fetch(url);
  const expectedStatus = parseInt(statusCode);

  if (response.status !== expectedStatus) {
    throw new Error(`Expected status ${statusCode}, got ${response.status}`);
  }

  console.log(`Home page returned status ${statusCode}`);
}

@Step("API config endpoint is accessible")
export async function checkConfigEndpoint() {
  const url = (global as any).webuiUrl || 'http://localhost:3000';

  const response = await fetch(`${url}/api/config`);

  if (!response.ok) {
    throw new Error("API config endpoint is not accessible");
  }

  console.log("API config endpoint is accessible");
}

@Step("Web UI version is displayed")
export async function checkWebUIVersion() {
  const config = (global as any).webuiConfig;

  if (!config || !config.version) {
    throw new Error("Web UI version is not available");
  }

  console.log(`Web UI version: ${config.version}`);
}
