import type { LogLevel } from "@/types";

class Logger {
  private level: LogLevel;
  
  constructor() {
    this.level = (process.env.LOG_LEVEL as LogLevel) || "info";
  }
  
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ["debug", "info", "warn", "error"];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }
  
  private format(level: LogLevel, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const formatted = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    if (args.length > 0) {
      return `${formatted} ${JSON.stringify(args)}`;
    }
    return formatted;
  }
  
  debug(message: string, ...args: any[]) {
    if (this.shouldLog("debug")) {
      console.error(this.format("debug", message, ...args));
    }
  }
  
  info(message: string, ...args: any[]) {
    if (this.shouldLog("info")) {
      console.error(this.format("info", message, ...args));
    }
  }
  
  warn(message: string, ...args: any[]) {
    if (this.shouldLog("warn")) {
      console.error(this.format("warn", message, ...args));
    }
  }
  
  error(message: string, ...args: any[]) {
    if (this.shouldLog("error")) {
      console.error(this.format("error", message, ...args));
    }
  }
}

export const logger = new Logger();