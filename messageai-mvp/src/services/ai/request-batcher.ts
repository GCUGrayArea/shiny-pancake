/**
 * Request Batcher Service
 * Batches multiple simultaneous AI requests to reduce API calls
 */

interface BatchRequest<T> {
  key: string;
  resolve: (value: T) => void;
  reject: (error: any) => void;
}

interface BatchConfig {
  /** Maximum time to wait for more requests before executing batch (ms) */
  maxWaitTime: number;
  /** Maximum number of requests to batch together */
  maxBatchSize: number;
}

const DEFAULT_CONFIG: BatchConfig = {
  maxWaitTime: 50, // 50ms window for batching
  maxBatchSize: 10, // Max 10 requests per batch
};

/**
 * Create a request batcher for a specific operation
 */
export function createBatcher<TInput, TOutput>(
  batchHandler: (inputs: TInput[]) => Promise<TOutput[]>,
  config: Partial<BatchConfig> = {}
) {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const pendingRequests: Array<{ input: TInput; request: BatchRequest<TOutput> }> = [];
  let batchTimeout: NodeJS.Timeout | null = null;

  /**
   * Execute the pending batch
   */
  const executeBatch = async () => {
    if (pendingRequests.length === 0) return;

    // Take all pending requests
    const batch = pendingRequests.splice(0, pendingRequests.length);
    batchTimeout = null;

    try {
      // Extract inputs and execute batch handler
      const inputs = batch.map(item => item.input);
      const results = await batchHandler(inputs);

      // Resolve all promises with their corresponding results
      batch.forEach((item, index) => {
        item.request.resolve(results[index]);
      });
    } catch (error) {
      // Reject all promises with the error
      batch.forEach(item => {
        item.request.reject(error);
      });
    }
  };

  /**
   * Add a request to the batch queue
   */
  const add = (input: TInput): Promise<TOutput> => {
    return new Promise((resolve, reject) => {
      // Add to pending requests
      pendingRequests.push({
        input,
        request: { key: JSON.stringify(input), resolve, reject },
      });

      // Execute immediately if batch is full
      if (pendingRequests.length >= fullConfig.maxBatchSize) {
        if (batchTimeout) {
          clearTimeout(batchTimeout);
          batchTimeout = null;
        }
        executeBatch();
        return;
      }

      // Otherwise, schedule batch execution
      if (!batchTimeout) {
        batchTimeout = setTimeout(() => {
          executeBatch();
        }, fullConfig.maxWaitTime);
      }
    });
  };

  /**
   * Flush all pending requests immediately
   */
  const flush = async () => {
    if (batchTimeout) {
      clearTimeout(batchTimeout);
      batchTimeout = null;
    }
    await executeBatch();
  };

  return { add, flush };
}

/**
 * Request deduplicator - ensures identical requests share the same promise
 */
export function createDeduplicator<TKey, TValue>() {
  const pending = new Map<string, Promise<TValue>>();

  /**
   * Execute operation with deduplication
   * If the same key is requested multiple times while pending, all requests share the same promise
   */
  const execute = (key: TKey, operation: () => Promise<TValue>): Promise<TValue> => {
    const keyString = typeof key === 'string' ? key : JSON.stringify(key);

    // Return existing promise if already pending
    const existingPromise = pending.get(keyString);
    if (existingPromise) {
      return existingPromise;
    }

    // Create new promise and store it
    const promise = operation()
      .finally(() => {
        // Remove from pending once complete
        pending.delete(keyString);
      });

    pending.set(keyString, promise);
    return promise;
  };

  /**
   * Clear all pending requests
   */
  const clear = () => {
    pending.clear();
  };

  /**
   * Get count of pending requests
   */
  const getPendingCount = () => {
    return pending.size;
  };

  return { execute, clear, getPendingCount };
}
