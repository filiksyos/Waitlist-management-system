const AutoLaunch = require('auto-launch');
const path = require('path');
const { app } = require('electron');

class AutoLaunchManager {
  constructor() {
    this.autoLauncher = new AutoLaunch({
      name: 'Clinic Queue Display',
      path: process.execPath,
      isHidden: false, // Set to true if you want it to start minimized
    });
    
    this.isProduction = !process.argv.includes('--dev');
  }

  /**
   * Enable auto-launch at startup
   */
  async enable() {
    try {
      const isEnabled = await this.isEnabled();
      if (isEnabled) {
        console.log('Auto-launch is already enabled');
        return true;
      }

      await this.autoLauncher.enable();
      console.log('Auto-launch enabled successfully');
      return true;
    } catch (error) {
      console.error('Failed to enable auto-launch:', error);
      return false;
    }
  }

  /**
   * Disable auto-launch at startup
   */
  async disable() {
    try {
      const isEnabled = await this.isEnabled();
      if (!isEnabled) {
        console.log('Auto-launch is already disabled');
        return true;
      }

      await this.autoLauncher.disable();
      console.log('Auto-launch disabled successfully');
      return true;
    } catch (error) {
      console.error('Failed to disable auto-launch:', error);
      return false;
    }
  }

  /**
   * Check if auto-launch is currently enabled
   */
  async isEnabled() {
    try {
      return await this.autoLauncher.isEnabled();
    } catch (error) {
      console.error('Failed to check auto-launch status:', error);
      return false;
    }
  }

  /**
   * Setup auto-launch based on production/development mode
   */
  async setup() {
    if (!this.isProduction) {
      console.log('Development mode - auto-launch disabled');
      return await this.disable();
    }

    console.log('Production mode - enabling auto-launch');
    return await this.enable();
  }

  /**
   * Get current auto-launch status for display
   */
  async getStatus() {
    try {
      const enabled = await this.isEnabled();
      return {
        enabled,
        mode: this.isProduction ? 'production' : 'development',
        execPath: process.execPath
      };
    } catch (error) {
      console.error('Failed to get auto-launch status:', error);
      return {
        enabled: false,
        mode: this.isProduction ? 'production' : 'development',
        execPath: process.execPath,
        error: error.message
      };
    }
  }

  /**
   * Toggle auto-launch on/off
   */
  async toggle() {
    try {
      const isCurrentlyEnabled = await this.isEnabled();
      if (isCurrentlyEnabled) {
        return await this.disable();
      } else {
        return await this.enable();
      }
    } catch (error) {
      console.error('Failed to toggle auto-launch:', error);
      return false;
    }
  }
}

module.exports = AutoLaunchManager; 