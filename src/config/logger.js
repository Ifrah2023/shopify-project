/**
 * Simple application logger
 * Compatible with Node.js ESM
 */

export class Logger {
  constructor(scope = "App") {
    this.scope = scope;
  }

  info(message) {
    console.log(`ℹ️  [${this.scope}] ${message}`);
  }

  warn(message) {
    console.warn(`⚠️  [${this.scope}] ${message}`);
  }

  error(message, error = "") {
    console.error(`❌ [${this.scope}] ${message}`, error);
  }

  success(message) {
    console.log(`✅ [${this.scope}] ${message}`);
  }

  debug(message) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`🐛 [${this.scope}] ${message}`);
    }
  }
}
