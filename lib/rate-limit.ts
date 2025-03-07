import { LRUCache } from "lru-cache";

//@ Rate limiting options configuration type
export interface RateLimitOptions {
  interval: number; // Time window in milliseconds
  limit: number; // Maximum number of requests in the time window
  uniqueTokenPerInterval?: number; // Maximum number of unique tokens in time window
}

//@ Rate limit response type
export interface RateLimitResponse {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Time in ms when the current window resets
}

//! Error when rate limit is exceeded
export class RateLimitExceededError extends Error {
  public status = 429;
  public reset: number;

  constructor(reset: number) {
    super("Rate limit exceeded");
    this.reset = reset;
  }
}

//@ Create a rate limiter with the specified options
export function rateLimit(options: RateLimitOptions) {
  const {
    interval = 60 * 1000, // 1 minute default
    limit = 10, // 10 requests per minute default
    uniqueTokenPerInterval = 500, // Max number of users per interval
  } = options;

  //? Create a cache to store rate limit information
  const tokenCache = new LRUCache<string, number[]>({
    max: uniqueTokenPerInterval,
    ttl: interval,
  });

  return {
    //@ Check if the request can proceed under rate limits
    check: async (
      maxRequests: number,
      token: string
    ): Promise<RateLimitResponse> => {
      const now = Date.now();
      const windowStart = now - interval;

      //? Get the existing timestamps for this token
      const timestamps = tokenCache.get(token) || [];

      //? Remove timestamps outside the current window
      const validTimestamps = timestamps.filter(
        (timestamp) => timestamp > windowStart
      );

      //? Check if the rate limit is exceeded
      if (validTimestamps.length >= maxRequests) {
        const oldestTimestamp = validTimestamps[0];
        const reset = oldestTimestamp + interval - now;

        throw new RateLimitExceededError(reset);
      }

      //? Add the current timestamp and update the cache
      const updatedTimestamps = [...validTimestamps, now].sort();
      tokenCache.set(token, updatedTimestamps);

      //? Return rate limit information
      return {
        success: true,
        limit: maxRequests,
        remaining: maxRequests - updatedTimestamps.length,
        reset: interval - (now - windowStart),
      };
    },
  };
}
