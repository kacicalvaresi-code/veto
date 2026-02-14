import { NativeModules, Platform } from 'react-native';

const { VetoMetricsModule } = NativeModules;

export interface AuditLogEntry {
  phoneNumber: string;
  type: 'call' | 'text';
  action: 'blocked' | 'reported';
  label?: string;
}

export interface Metrics {
  callsBlocked: number;
  textsFiltered: number;
}

/**
 * Native Metrics Module
 * 
 * Provides a bridge to native iOS (Swift) and Android (Kotlin) code
 * for tracking metrics and audit log entries in the App Group/SharedPreferences.
 */
class MetricsModuleClass {
  /**
   * Add an audit log entry
   * This is called automatically when a call/text is blocked or reported
   */
  async addAuditLogEntry(entry: AuditLogEntry): Promise<boolean> {
    if (!VetoMetricsModule) {
      console.warn('VetoMetricsModule is not available');
      return false;
    }

    try {
      await VetoMetricsModule.addAuditLogEntry(
        entry.phoneNumber,
        entry.type,
        entry.action,
        entry.label || null
      );
      return true;
    } catch (error) {
      console.error('Failed to add audit log entry:', error);
      return false;
    }
  }

  /**
   * Get current metrics (calls blocked, texts filtered)
   */
  async getMetrics(): Promise<Metrics> {
    if (!VetoMetricsModule) {
      console.warn('VetoMetricsModule is not available');
      return { callsBlocked: 0, textsFiltered: 0 };
    }

    try {
      const metrics = await VetoMetricsModule.getMetrics();
      return {
        callsBlocked: metrics.callsBlocked || 0,
        textsFiltered: metrics.textsFiltered || 0,
      };
    } catch (error) {
      console.error('Failed to get metrics:', error);
      return { callsBlocked: 0, textsFiltered: 0 };
    }
  }

  /**
   * Reset all metrics to zero
   */
  async resetMetrics(): Promise<boolean> {
    if (!VetoMetricsModule) {
      console.warn('VetoMetricsModule is not available');
      return false;
    }

    try {
      await VetoMetricsModule.resetMetrics();
      return true;
    } catch (error) {
      console.error('Failed to reset metrics:', error);
      return false;
    }
  }

  /**
   * Check if the native module is available
   */
  isAvailable(): boolean {
    return VetoMetricsModule !== undefined;
  }
}

export default new MetricsModuleClass();
