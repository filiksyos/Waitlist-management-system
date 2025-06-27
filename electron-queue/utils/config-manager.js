const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class ConfigManager {
  constructor() {
    this.configPath = path.join(app.getPath('userData'), 'config.json');
    this.defaultConfig = {
      serverUrl: '192.168.1.11:8080',
      autoReconnect: true,
      reconnectInterval: 2000
    };
  }

  /**
   * Load configuration from file, create with defaults if not exists
   */
  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf8');
        const config = JSON.parse(configData);
        
        // Merge with defaults to ensure all properties exist
        return { ...this.defaultConfig, ...config };
      } else {
        // Create config file with defaults
        this.saveConfig(this.defaultConfig);
        return this.defaultConfig;
      }
    } catch (error) {
      console.error('Error loading config:', error);
      return this.defaultConfig;
    }
  }

  /**
   * Save configuration to file
   */
  saveConfig(config) {
    try {
      // Ensure directory exists
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      // Validate config before saving
      const validatedConfig = this.validateConfig(config);
      if (!validatedConfig.valid) {
        throw new Error(validatedConfig.error);
      }

      // Save to file
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
      console.log('Configuration saved successfully');
      return { success: true };
    } catch (error) {
      console.error('Error saving config:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get default configuration
   */
  getDefaultConfig() {
    return { ...this.defaultConfig };
  }

  /**
   * Validate configuration object
   */
  validateConfig(config) {
    try {
      // Check required properties
      if (!config.serverUrl) {
        return { valid: false, error: 'Server URL is required' };
      }

      // Validate server URL format
      const urlValidation = this.validateServerUrl(config.serverUrl);
      if (!urlValidation.valid) {
        return urlValidation;
      }

      // Validate other properties
      if (typeof config.autoReconnect !== 'boolean') {
        return { valid: false, error: 'autoReconnect must be a boolean' };
      }

      if (typeof config.reconnectInterval !== 'number' || config.reconnectInterval < 1000) {
        return { valid: false, error: 'reconnectInterval must be a number >= 1000' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Validate server URL format (IP:PORT or hostname:PORT)
   */
  validateServerUrl(url) {
    try {
      if (!url || typeof url !== 'string') {
        return { valid: false, error: 'Server URL must be a string' };
      }

      // Remove protocol if present
      const cleanUrl = url.replace(/^(ws:\/\/|http:\/\/|https:\/\/)/, '');

      // Check for colon separator
      if (!cleanUrl.includes(':')) {
        return { valid: false, error: 'Server URL must include port (e.g., 192.168.1.11:8080)' };
      }

      const [host, portStr] = cleanUrl.split(':');

      // Validate host (basic check)
      if (!host || host.trim().length === 0) {
        return { valid: false, error: 'Invalid host in server URL' };
      }

      // Validate port
      const port = parseInt(portStr);
      if (isNaN(port) || port < 1 || port > 65535) {
        return { valid: false, error: 'Port must be a number between 1 and 65535' };
      }

      // Basic IP address validation (optional, allows hostnames too)
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (ipRegex.test(host)) {
        const parts = host.split('.');
        for (const part of parts) {
          const num = parseInt(part);
          if (num < 0 || num > 255) {
            return { valid: false, error: 'Invalid IP address format' };
          }
        }
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Reset configuration to defaults
   */
  resetToDefaults() {
    return this.saveConfig(this.defaultConfig);
  }

  /**
   * Get the WebSocket URL from server URL
   */
  getWebSocketUrl(serverUrl) {
    if (!serverUrl) return null;
    
    // Remove any existing protocol
    const cleanUrl = serverUrl.replace(/^(ws:\/\/|http:\/\/|https:\/\/)/, '');
    
    // Add WebSocket protocol
    return `ws://${cleanUrl}`;
  }
}

module.exports = ConfigManager; 