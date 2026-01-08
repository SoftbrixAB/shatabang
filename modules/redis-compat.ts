/**
 * Redis v3 compatibility wrapper for Redis v4/v5 client
 *
 * This wrapper provides callback-based methods that legacy libraries
 * (like vemdalen-index) can promisify, while using the modern Redis v5 client internally.
 */

export function createRedisV3Wrapper(modernClient: any): any {
  return {
    // Callback-based methods that wrap the modern promise-based API
    del: function(key: string, callback: (err: Error | null, result?: number) => void) {
      modernClient.del(key).then(
        (result) => callback(null, result),
        (err) => callback(err)
      );
    },

    get: function(key: string, callback: (err: Error | null, result?: string | null) => void) {
      modernClient.get(key).then(
        (result) => callback(null, result),
        (err) => callback(err)
      );
    },

    keys: function(pattern: string, callback: (err: Error | null, result?: string[]) => void) {
      modernClient.keys(pattern).then(
        (result) => callback(null, result),
        (err) => callback(err)
      );
    },

    lpush: function(key: string, ...args: any[]) {
      const callback = args.pop();
      const values = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
      modernClient.lPush(key, values).then(
        (result: any) => callback(null, result),
        (err: any) => callback(err)
      );
    },

    lrange: function(key: string, start: number, stop: number, callback: (err: Error | null, result?: string[]) => void) {
      modernClient.lRange(key, start, stop).then(
        (result) => callback(null, result),
        (err) => callback(err)
      );
    },

    set: function(key: string, value: string, callback: (err: Error | null, result?: string) => void) {
      modernClient.set(key, value).then(
        (result: any) => callback(null, result),
        (err: any) => callback(err)
      );
    },

    // Pass through other properties from the modern client
    quit: () => modernClient.quit(),
    disconnect: () => modernClient.disconnect(),
  };
}
