# Clinic Waitlist Management System

A real-time clinic waitlist management system designed for **multi-doctor** environments with instant queue updates across all interfaces.

## Configuration

### Doctor Count Setup

Configure the number of doctors using the `.env` file in the root directory:

```bash
# Set to 1 for single doctor mode (default)
DOCTOR_COUNT=1

# Set to 2 for two doctor mode
DOCTOR_COUNT=2
```

**Single Doctor Mode (DOCTOR_COUNT=1):**
- Auto-selects Doctor 1
- Hides doctor selection UI
- Shows only one queue section
- Removes any Doctor 2 patient data

**Two Doctor Mode (DOCTOR_COUNT=2):**
- Shows doctor selection dropdown
- Displays both doctor queues
- Full multi-doctor functionality

**Note:** Changes take effect only after restarting the server and applications.

## Installation

```bash
pnpm install
```

## Usage

1. Start the WebSocket server:
```bash
node server.js
```

2. Open interfaces in browser:
- Receptionist: `http://localhost:8080/Receptionist.html`
- Doctor: `http://localhost:8080/Doctor.html`
- Queue Display: `http://localhost:8080/display.html`

Or use the Electron apps:
- Queue Manager: `cd electron-queue && npm start`
- Display: `cd electron-display && npm start`

## Features

- **Multi-Doctor Support**: Separate queues for Doctor 1 and Doctor 2
- **Real-time Updates**: WebSocket-based instant synchronization
- **Role-based Interfaces**: Receptionist, Doctor, and Public Display views
- **Queue Management**: FIFO patient ordering with doctor assignment
- **Configurable Single/Multi-Doctor Support**: Automatically handles switching between modes
- **Automatic Patient Data Cleanup**: Removes data when switching between modes

## System Roles

### Receptionist Interface
- **URL**: `http://localhost:8080/Receptionist.html`
- **Function**: Creates patient entries with doctor selection
- **Features**:
  - Required doctor selection (Doctor 1 or Doctor 2)
  - Patient information form with validation
  - Automatic queue broadcasting
  - Print functionality for patient cards

### Doctor Interfaces
- **Doctor 1**: `http://localhost:8080/Doctor.html?doctor=doctor1`
- **Doctor 2**: `http://localhost:8080/Doctor.html?doctor=doctor2`
- **Function**: View and manage assigned patients
- **Features**:
  - Doctor-specific patient queue
  - Remove individual patients
  - Clear all patients for specific doctor
  - Real-time queue updates

### Public Display
- **URL**: `http://localhost:8080/Display.html`
- **Function**: Split-screen display for waiting room
- **Features**:
  - Side-by-side doctor queues
  - Patient names with queue position
  - Real-time updates from both doctors
  - Clean waiting room interface

### Electron Display (Optional)
- **Location**: `electron-display/`
- **Function**: Standalone display application
- **Features**:
  - Full-screen queue display
  - HDMI connection monitoring
  - Same functionality as web display

## Quick Start

1. **Start the Server**:
   ```bash
   node server.js
   ```
   Server runs on `http://localhost:8080`

2. **Access Interfaces**:
   - Receptionist: `http://localhost:8080/Receptionist.html`
   - Doctor 1: `http://localhost:8080/Doctor.html?doctor=doctor1`
   - Doctor 2: `http://localhost:8080/Doctor.html?doctor=doctor2`
   - Display: `http://localhost:8080/Display.html`

3. **Workflow**:
   - Receptionist creates patient entries with doctor assignment
   - Patients appear in assigned doctor's queue
   - Public display shows both queues side-by-side
   - Doctors remove patients when consultation is complete

## Data Structure

Each patient record includes:
```javascript
{
  cardNumber: "123",
  date: "2024-01-15",
  patientName: "John Doe",
  age: "30",
  sex: "M",
  address: "123 Main St",
  wereda: "District",
  kebele: "Neighborhood", 
  phoneNumber: "1234567890",
  doctorId: "doctor1", // NEW: doctor1 or doctor2
  createdAt: "2024-01-15T10:30:00Z"
}
```

## URL Parameters

- `Doctor.html?doctor=doctor1` - Doctor 1 interface
- `Doctor.html?doctor=doctor2` - Doctor 2 interface  
- `Doctor.html` - Defaults to Doctor 1

## Technical Details

- **Backend**: Node.js with Express and WebSocket
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Data Storage**: localStorage with WebSocket synchronization
- **Real-time**: WebSocket broadcast to all connected clients
- **Queue Logic**: FIFO (First In, First Out) per doctor

## File Structure
```
waitlist/
├── server.js              # Node.js server with WebSocket
├── client.js              # Shared WebSocket client logic
├── Receptionist.html      # Patient entry form
├── Doctor.html            # Doctor queue interface
├── Display.html           # Public split-screen display
├── electron-display/      # Standalone Electron app
└── README.md              # This file
```

## Troubleshooting

**Doctor interface shows no patients:**
- Check URL has correct `?doctor=doctor1` or `?doctor=doctor2` parameter
- Verify patients were assigned to the correct doctor in receptionist form

**Real-time updates not working:**
- Ensure server is running on port 8080
- Check browser console for WebSocket connection errors
- Verify all interfaces are connected to same server

**Display not splitting properly:**
- Check browser window size and zoom level
- Ensure CSS Grid is supported (modern browsers)
- Refresh page if layout appears broken

## Multi-Doctor Workflow

1. **Patient Registration**: Receptionist selects doctor and fills patient form
2. **Queue Assignment**: Patient automatically added to selected doctor's queue  
3. **Doctor View**: Each doctor sees only their assigned patients
4. **Public Display**: Split screen shows both doctor queues simultaneously
5. **Patient Removal**: Doctor removes patient when consultation complete
6. **Real-time Sync**: All changes instantly reflected across all interfaces

## License
MIT 