// WebSocket client logic for all roles
// Set the WebSocket server address here (update to your server's local IP if needed)
const WS_SERVER_URL = 'ws://localhost:8080'; // Change to ws://<server-ip>:8080 on deployment

let ws;
let reconnectTimeout = 2000;

function connectWebSocket() {
  ws = new WebSocket(WS_SERVER_URL);

  ws.onopen = () => {
    // On connect, send our current queue (if any)
    const patients = localStorage.getItem('patients');
    ws.send(JSON.stringify({ type: 'sync', patients: patients ? JSON.parse(patients) : [] }));
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === 'update') {
        // Update localStorage and UI
        localStorage.setItem('patients', JSON.stringify(msg.patients));
        if (window.renderQueue) {
          window.renderQueue(msg.patients);
        } else if (typeof displayPatients === 'function') {
          displayPatients();
        }
      }
    } catch (e) {
      console.error('WebSocket message error:', e);
    }
  };

  ws.onclose = () => {
    setTimeout(connectWebSocket, reconnectTimeout);
  };

  ws.onerror = (err) => {
    ws.close();
  };
}

connectWebSocket();

// Utility to broadcast queue changes
function broadcastQueueUpdate() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    const patients = localStorage.getItem('patients');
    ws.send(JSON.stringify({ type: 'update', patients: patients ? JSON.parse(patients) : [] }));
  }
}

// Patch add/remove/clear actions to broadcast updates
(function patchQueueActions() {
  // For add (Receptionist.html)
  if (typeof saveFormData === 'function') {
    const origSave = saveFormData;
    window.saveFormData = function(event) {
      origSave.call(this, event);
      setTimeout(broadcastQueueUpdate, 500); // after localStorage update
    };
  }
  // For remove/clear (Doctor.html)
  if (typeof removePatient === 'function' || typeof clearAllPatients === 'function') {
    const origRemove = removePatient || clearAllPatients;
    window.removePatient = function(index) {
      origRemove.call(this, index);
      setTimeout(broadcastQueueUpdate, 500);
    };
  }
  if (typeof clearAllPatients === 'function') {
    const origClear = clearAllPatients;
    window.clearAllPatients = function() {
      origClear.call(this);
      setTimeout(broadcastQueueUpdate, 500);
    };
  }
})(); 