# E2E Tests for Minimal AI PaaS

This directory contains end-to-end tests for the Minimal AI PaaS platform using [Gauge](https://gauge.org/).

## Prerequisites

1. **Gauge** - Test automation framework
   ```bash
   # macOS
   brew install gauge

   # Or download from https://docs.gauge.org/getting_started/installing-gauge.html
   ```

2. **Node.js 18+** - For running test step implementations

3. **Docker Desktop** - Platform services must be available

## Setup

Install test dependencies:

```bash
cd tests
npm install
```

Install Gauge JavaScript plugin (if not already installed):

```bash
gauge install js
```

## Test Structure

```
tests/
├── specs/                          # Test specifications (Gauge format)
│   ├── platform_initialization.spec
│   ├── service_health_checks.spec
│   ├── webui_functionality.spec
│   └── api_gateway_requests.spec
├── step_implementations/           # Step implementations (TypeScript)
│   ├── platform_steps.ts
│   ├── service_steps.ts
│   ├── webui_steps.ts
│   └── api_steps.ts
├── env/default/                    # Environment configuration
│   └── default.properties
├── manifest.json                   # Gauge project configuration
├── package.json                    # npm dependencies
└── tsconfig.json                   # TypeScript configuration
```

## Running Tests

### Run all tests
```bash
cd tests
npm test
```

### Run specific test suites
```bash
# Platform initialization
npm run test:platform

# Service health checks
npm run test:health

# Web UI functionality
npm run test:webui

# API gateway requests
npm run test:api
```

### Run from project root
```bash
# Ensure platform is running first
npm run init

# Then run tests
cd tests && npm test
```

## Test Specifications

### 1. Platform Initialization (platform_initialization.spec)

Tests the setup and initialization of the platform:
- Environment configuration
- Docker service startup
- Model availability
- Container health

### 2. Service Health Checks (service_health_checks.spec)

Verifies all services are healthy and responding:
- Docker daemon status
- Container status checks
- Service endpoint availability
- LiteLLM gateway health

### 3. Web UI Functionality (webui_functionality.spec)

Tests the Open WebUI interface:
- Web UI accessibility
- Configuration endpoints
- User authentication
- JWT token validation

### 4. API Gateway Requests (api_gateway_requests.spec)

Tests API requests through the LiteLLM gateway:
- Authentication
- Chat completion requests
- Model parameters
- Error handling
- Usage statistics

## Test Reports

Test results are generated in the `reports/` directory:
- HTML reports with detailed test results
- Execution logs in `logs/` directory

To view reports after running tests:
```bash
open reports/html-report/index.html
```

## Writing New Tests

### 1. Create a new specification file

Create a `.spec` file in `specs/` directory using Gauge markdown format:

```markdown
# My New Feature

This specification tests...

## Scenario Name
* Step one
* Step two with "parameter"
* Step three with <value>
```

### 2. Implement step definitions

Add step implementations in TypeScript:

```typescript
import { Step } from "gauge-ts";

@Step("Step one")
export async function stepOne() {
  // Implementation
}

@Step("Step two with <param>")
export async function stepTwo(param: string) {
  // Implementation with parameter
}
```

### 3. Run your new tests

```bash
gauge run specs/my_new_feature.spec
```

## CI/CD Integration

To integrate these tests in CI/CD:

```yaml
# Example GitHub Actions
- name: Setup Platform
  run: npm run init

- name: Wait for Services
  run: sleep 30

- name: Run E2E Tests
  working-directory: tests
  run: npm test

- name: Upload Test Reports
  uses: actions/upload-artifact@v3
  with:
    name: test-reports
    path: tests/reports/
```

## Troubleshooting

### Tests fail with "Container not running"

Ensure the platform is running:
```bash
npm run init
npm run health
```

### Module import errors

Rebuild TypeScript:
```bash
cd tests
rm -rf dist
npm test
```

### Gauge not found

Install Gauge:
```bash
brew install gauge  # macOS
# or follow https://docs.gauge.org/getting_started/installing-gauge.html
```

## Best Practices

1. **Keep specs readable** - Write specifications in plain English
2. **Reuse steps** - Create generic, reusable step implementations
3. **Use data stores** - Share data between steps using global storage
4. **Clean up** - Use BeforeSuite/AfterSuite for setup/teardown
5. **Parallel execution** - Run independent specs in parallel for speed

## Additional Resources

- [Gauge Documentation](https://docs.gauge.org/)
- [Gauge TypeScript Plugin](https://github.com/getgauge-contrib/gauge-ts)
- [Writing Specifications](https://docs.gauge.org/writing-specifications.html)
- [Step Implementations](https://docs.gauge.org/longstart-execution.html)
