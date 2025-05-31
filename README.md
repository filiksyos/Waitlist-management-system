# Clinic Waitlist Management System

## Overview
A simple real-time clinic waitlist system for Receptionist, Doctor, and Public Display roles. Real-time updates are achieved via a local WebSocket server. No internet required—just a local network (WiFi or Ethernet).

## Features
- Receptionist: Add patients (Receptionist.html)
- Doctor: View and remove patients (Doctor.html)
- Public Display: Shows only patient names and queue position (Display.html)
- Real-time updates across all roles
- Minimal setup, no database required

## Setup Instructions

### 1. Install Node.js
Download and install Node.js from https://nodejs.org/

### 2. Install Dependencies
Open a terminal in the project directory and run:

```
npm install
```

### 3. Start the WebSocket Server
Run:
```
npm start
```
The server will start on port 8080 by default.

### 4. Find Your Server's Local IP Address
- On Windows: Run `ipconfig` in Command Prompt
- On Mac/Linux: Run `ifconfig` in Terminal
- Look for something like `192.168.x.x`

### 5. Open the App on Each Device
- Receptionist: Open `http://<server-ip>:8080/Receptionist.html`
- Doctor: Open `http://<server-ip>:8080/Doctor.html`
- Public Display: Open `http://<server-ip>:8080/Display.html`

(Replace `<server-ip>` with your server's local IP address)

### 6. Network Requirements
- All devices must be connected to the same local network (WiFi or Ethernet)
- No internet connection required

## Usage
- Receptionist adds a patient: All views update instantly
- Doctor removes a patient: All views update instantly
- Public display shows only names and queue position

## Troubleshooting
- If real-time updates do not work, check:
  - All devices are on the same network
  - The WebSocket server is running
  - The correct server IP is set in `client.js` (change `localhost` to your server's IP)

## Customization
- To change the WebSocket server address, edit `client.js`:
  ```js
  const WS_SERVER_URL = 'ws://<server-ip>:8080';
  ```

## License
MIT 

## File Structure

Each role has its dedicated interface:
- Receptionist: Add patients (Receptionist.html)
- Doctor: View and remove patients (Doctor.html)
- Public Display: Shows only patient names and queue position (Display.html)

## Quick Start

1. Start the server: `node server.js` or `start-server.bat`
2. Open the appropriate interface for each role:
   - Receptionist: Open `http://<server-ip>:8080/Receptionist.html`
   - Doctor: Open `http://<server-ip>:8080/Doctor.html`
   - Public Display: Open `http://<server-ip>:8080/Display.html`

(Replace `<server-ip>` with your server's local IP address) 