/**
 * A callback to parse the value
 */
export type ReviverFn<T> = (str: string) => T;

/**
 * A callback to stringify the value
 */
export type ReplacerFn<T> = (value: T) => string;

/**
 * A callback used to obtain a value when the cache false to hit.
 */
export type ValueFn<T> = () => T;

/**
 * The CachePoolInterface provides methods to fluently obtain a cached item(s) and encourage the use from turning into a
 * global registry of conflicts and spaghetti code.
 */
export interface CachePoolInterface {

    /**
     * Get the cached item by the argument `key` if no cache it, obtain and cache the item using the `CacheFn<T>` function.
     *
     * ### Example
     * ```
     * ```
     * @param key The cached item's key.
     * @param value a callback which return a value or the value itself
     * @param replacer a callback used to stringify the value
     * @param reviver a callback used to parse the value
     * @param ttl a Date or Unix timestamp indicating the cache item's TTL
     */
    get<T>(key: string, value: ValueFn<T> | T, ttl?: number | Date, replacer?: ReplacerFn<T>, reviver?: ReviverFn<T>): T;

    /**
     * Delete the cached item from storage
     *
     * @param key
     */
    delete<T>(key: string): void;

    /**
     * Indicates that a cache item exists for a key.
     *
     *  **IMPORTANT** this does not verify the TTL just that an item exists for a specific key.
     * @param key
     */
    has(key: string): boolean;

    /**
     * Clear all items cached by this pool
     */
    clear(): void;
}


/**
 * The NamespaceCachePoolInterface defines a CachePoolInterface which prefixes all cached items with a namespace value.
 */
export interface NamespaceCachePoolInterface extends CachePoolInterface {

    /**
     * Getter for the cache pool's namespace.
     */
    get namespace(): string
}