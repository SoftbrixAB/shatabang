import * as path from 'path';
const ArrayCache = require('idre-array-cache');

let lastTimestamp: number = Date.now();

class WorkLog {
  private _log: any;

  constructor(cacheDir: string) {
    const importLogPath = path.join(cacheDir, 'workLog');
    this._log = new ArrayCache();
    // The open call is async but this should be fine and the ArrayCache is self healing
    this._log.open(importLogPath); // Delay option is default 200ms
  }

  push(logPost: any): void {
    this._log.push(logPost);
    lastTimestamp = Date.now();
  }

  async clear(): Promise<void> {
    await this._log.clear();
  }

  async close(): Promise<void> {
    await this._log.close();
  }

  slice(start?: number, end?: number): any[] {
    return this._log.slice(start, end);
  }

  tail(index: number): any[] {
    return this._log.slice(index);
  }

  lastTimestamp(): number {
    return lastTimestamp;
  }
}

export default WorkLog;
