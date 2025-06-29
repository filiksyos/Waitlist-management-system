const WebSocket = require('ws');
const EventEmitter = require('events');

class WebSocketClient extends EventEmitter {
  constructor() {
    super();
    this.ws = null;
    this.serverUrl = null;
    this.connectionStatus = 'disconnected';
    this.reconnectTimeout = null;
    this.reconnectInterval = 2000;
    this.maxReconnectInterval = 30000;
    this.autoReconnect = true;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
  }

  connect(serverUrl, options = {}) {
    if (!serverUrl) {
      this.emit('error', new Error('Server URL is required'));
      return;
    }

    this.serverUrl = serverUrl;
    this.autoReconnect = options.autoReconnect !== false;
    this.reconnectInterval = options.reconnectInterval || 2000;

    this.disconnect();
    this.setStatus('connecting');
    console.log('Connecting to WebSocket server:', serverUrl);

    try {
      const wsUrl = serverUrl.startsWith('ws://') ? serverUrl : `ws://${serverUrl}`;
      this.ws = new WebSocket(wsUrl);
      this.setupEventHandlers();
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.setStatus('error');
      this.emit('error', error);
      this.scheduleReconnect();
    }
  }

  disconnect() {
    this.autoReconnect = false;
    this.clearReconnectTimeout();

    if (this.ws) {
      this.ws.removeAllListeners();
      
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      
      this.ws = null;
    }

    this.setStatus('disconnected');
  }

  sendMessage(data) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, cannot send message');
      return false;
    }

    try {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      this.ws.send(message);
      console.log('Message sent:', data);
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      this.emit('error', error);
      return false;
    }
  }

  getConnectionStatus() {
    return this.connectionStatus;
  }

  setupEventHandlers() {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connected successfully');
      this.setStatus('connected');
      this.reconnectAttempts = 0;
      this.reconnectInterval = 2000;
      this.emit('connect');
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Message received:', data);
        this.emit('message', data);
      } catch (error) {
        console.error('Error parsing message:', error);
        this.emit('message', event.data);
      }
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      this.setStatus('disconnected');
      this.emit('disconnect', event);
      
      if (this.autoReconnect) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.setStatus('error');
      this.emit('error', error);
    };
  }

  setStatus(status) {
    if (this.connectionStatus !== status) {
      const previousStatus = this.connectionStatus;
      this.connectionStatus = status;
      console.log(`Connection status changed: ${previousStatus} -> ${status}`);
      this.emit('statusChange', status, previousStatus);
    }
  }

  scheduleReconnect() {
    if (!this.autoReconnect || this.reconnectAttempts >= this.maxReconnectAttempts) {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.log('Max reconnection attempts reached');
        this.setStatus('error');
      }
      return;
    }

    this.clearReconnectTimeout();
    
    this.reconnectAttempts++;
    console.log(`Scheduling reconnection attempt ${this.reconnectAttempts} in ${this.reconnectInterval}ms`);
    
    this.reconnectTimeout = setTimeout(() => {
      if (this.autoReconnect && this.serverUrl) {
        console.log(`Reconnection attempt ${this.reconnectAttempts}`);
        this.connect(this.serverUrl, { 
          autoReconnect: this.autoReconnect,
          reconnectInterval: this.reconnectInterval 
        });
      }
    }, this.reconnectInterval);

    this.reconnectInterval = Math.min(this.reconnectInterval * 1.5, this.maxReconnectInterval);
  }

  clearReconnectTimeout() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  resetReconnectAttempts() {
    this.reconnectAttempts = 0;
    this.reconnectInterval = 2000;
  }

  isConnected() {
    return this.connectionStatus === 'connected';
  }

  isConnecting() {
    return this.connectionStatus === 'connecting';
  }

  getServerUrl() {
    return this.serverUrl;
  }
}

module.exports = WebSocketClient;
