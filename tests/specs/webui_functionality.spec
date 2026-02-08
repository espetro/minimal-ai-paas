# Web UI Functionality

This specification tests the Open WebUI chat interface and user interactions.

## Web UI Configuration
* Open WebUI is accessible at "http://localhost:3000"
* Get Web UI configuration
* Verify authentication is enabled
* Verify signup is disabled

## User Authentication
* Login with email "admin@example.com" and password "admin_password123"
* Receive valid JWT token
* Token is not empty

## Chat Interface Availability
* Access Web UI home page returns status "200"
* API config endpoint is accessible
* Web UI version is displayed
