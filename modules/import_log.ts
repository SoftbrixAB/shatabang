import * as path from 'path';
const ArrayCache = require('idre-array-cache');

let lastTimestamp: number = Date.now();

class ImportLog {
  private _log: any;

  constructor(cacheDir: string) {
    const importLogPath = path.join(cacheDir, 'importlog');
    this._log = new ArrayCache();
    // The open call is async but this should be fine and the ArrayCache is self healing
    this._log.open(importLogPath); // Delay option is default 200ms
    this._log.on('change', () => {
      lastTimestamp = Date.now();
    });
  }

  push(id: number): void {
    if (!Number.isInteger(id)) {
      throw new Error('Expected {id} to be numeric, was: ' + typeof id + '/' + id);
    }
    this._log.push(id);
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

export default ImportLog;
