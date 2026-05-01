/**
 * Simple logging utility for infrastructure
 * Provides structured logging with levels and timestamps
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: unknown;
}

class Logger {
  private service: string;
  private minLevel: LogLevel;

  private levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(service: string, minLevel: LogLevel = 'info') {
    this.service = service;
    this.minLevel = minLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] >= this.levels[this.minLevel];
  }

  private formatEntry(entry: LogEntry): string {
    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${this.service}]`;
    if (entry.data) {
      return `${prefix} ${entry.message} ${JSON.stringify(entry.data)}`;
    }
    return `${prefix} ${entry.message}`;
  }

  private log(level: LogLevel, message: string, data?: unknown) {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
    };

    const formatted = this.formatEntry(entry);

    switch (level) {
      case 'error':
        console.error(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      default:
        console.log(formatted);
    }
  }

  debug(message: string, data?: unknown) {
    this.log('debug', message, data);
  }

  info(message: string, data?: unknown) {
    this.log('info', message, data);
  }

  warn(message: string, data?: unknown) {
    this.log('warn', message, data);
  }

  error(message: string, data?: unknown) {
    this.log('error', message, data);
  }
}

// Pre-configured loggers for each service
export const chromaLogger = new Logger('CHROMA', process.env.LOG_LEVEL as LogLevel || 'info');
export const openaiLogger = new Logger('OPENAI', process.env.LOG_LEVEL as LogLevel || 'info');
export const ingestLogger = new Logger('INGEST', process.env.LOG_LEVEL as LogLevel || 'info');
export const apiLogger = new Logger('API', process.env.LOG_LEVEL as LogLevel || 'info');

// Generic logger factory
export function createLogger(service: string, minLevel?: LogLevel): Logger {
  return new Logger(service, minLevel);
}

export default Logger;
