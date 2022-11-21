import {MemoryStorage} from "./storage/memory-storage";


export type CacheItem<T> = { value: T; expiresAt: number; hit: boolean; };

/**
 * A callback function used to obtain a value when the cache fails to hit.
 */
export type CacheFn<T> = (item: CacheItem<T>) => T;

/**
 * The CachePoolInterface provides methods to fluently obtain a cached item(s) and encourage the use from turning into a
 * global registry of conflicts and spaghetti code.
 */
export interface CachePoolInterface {

    /**
     * Get the cached item by the argument `key` if no cache it, obtain and cache the item from the `CacheFn`
     * @param key The cached item's key.
     * @param fn Call function if cache fails to hit.
     */
    get<T>(key: string, fn: CacheFn<T>): T;

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
 * A default CachePoolInterface implementation.
 */
export class CachePool implements CachePoolInterface {

    /**
     * Storage used to cache items.
     * @private
     */
    readonly #storage: Storage;

    /**
     * Constructs a CachePool
     * @param storage
     */
    constructor(storage?: Storage) {
        this.#storage = storage ?? new MemoryStorage();
    }

    get storage(): Storage {
        return this.#storage;
    }


    /**
     * Gets a CachedItem for a specific key.
     * @param key The key used to store the CachedItem
     * @private
     */
    #getItem<T>(key: string): CacheItem<T> {
        const cacheItem:CacheItem<T> = {value: undefined, expiresAt: Infinity, hit: false};
        const item = this.#storage.getItem(key);
        if( null != item) {
            JSON.parse(item, (key:string, value: any) => {
                if( key in cacheItem) {
                    cacheItem[key] = value;
                }
            });
        }
        return cacheItem;
    }

    get<T>(key: string, fn: CacheFn<T>): T {
        let now = new Date().getTime();
        let item = this.#getItem<T>(key);
        if (!item.hit || (isFinite(item.expiresAt) && item.expiresAt < now)) {
            item.hit = true;
            item.value = fn(item);
            this.#storage.setItem(key, JSON.stringify(item));
        }
        return item.value;
    }

    delete<T>(key: string): void {
        this.#storage.removeItem(key);
    }

    has(key: string): boolean {
        return null != this.#storage.getItem(key);
    }

    clear(): void {
        this.#storage.clear();
    }
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

/**
 * NamedCachePool is used to prefix cached items with a fixed namespace.
 *
 *  By default, cached items are stored with the namespace automatically prefixed to the key, as in:
 *
 *   ```
 *   const cache = new NamedCachePool('default');
 *   const value = cache.get('my-item', async (item<MyObject>) => {
 *       item.expiresAfter = 60 * 60 * 24;
 *       return await fetch('https://some.com/api/somthing-cool')
 *           .then(response => response.json() as MyObject);
 *   });
 *   ```
 *
 *   Give the above example, if the cache hits, (the value is not null and not expired) it is retrieved from the
 *   underlying storage using key `default:my-item`. Otherwise, the item is obtained using the callback function. The
 *   example demonstrates how an item's TTL is set. Show it is set to expire after 24 hours (86400 sec.) from when it is
 *   persisted to storage.
 */
export class NamespaceCachePool extends CachePool implements NamespaceCachePoolInterface {

    /**
     * The cache pool's namespace
     * @private
     */
    readonly #namespace: string;

    /**
     * Constructs a NamedCachePool
     * @param namespace the namespace for the
     * @param storage
     */
    constructor(namespace: string, storage?: Storage) {
        super(storage ?? new MemoryStorage());
        this.#namespace = namespace;
    }

    get namespace(): string {
        return this.#namespace;
    }

    #getNamespaceKey(key: string): string {
        return `${this.#namespace}.${key}`;
    }

    get<T>(key: string, fn: CacheFn<T>): T {
        return super.get(this.#getNamespaceKey(key), fn);
    }

    delete<T>(key: string): void {
        super.delete(this.#getNamespaceKey(key));
    }

    has(key: string): boolean {
        return super.has(this.#getNamespaceKey(key));
    }

    clear(): void {
        let keys: string[] = [];
        for (let i = 0; i < this.storage.length; i++) {
            const key = this.storage.key(i);
            if (key?.includes(this.#namespace)) {
                keys.push(key);
            }
        }
        keys.forEach(key => this.storage.removeItem(key));
    }
}

/**
 * A ChainedCachePool provides a convenient interface to access different namespace cache pools by inspecting the
 * items key's namespace.
 *
 * ```
 * const cache = new ChainedCachePool(
 *          new NamespaceCachePool('session-storage', window.sessionStorage),
 *          new NamespaceCachePool('local-storage', window.localStorage),
 *          new NamespaceCachePool('memory'), // default is MemoryStorage which is in-memory
 *          new NamespaceCachePool('fs-storage', new FilesystemStorage('/tmp/cache'))
 *      )
 *  );
 *
 *  let dataFromFilesystem = cache.get('fs-storage.info', async (item: ItemInterface<MyObject>) => {
 *      return await fetch('https://some.com/super-cool/api/info')
 *          .then(response => response.json as MyObject));
 *  });
 *
 *  // will only exist in-memory
 *  let dataFromMemory = cache.get('memory.info', async (item: ItemInterface<MyObject>) => {
 *      return await fetch('https://another.some.com/super-cool/api/info')
 *          .then(response => response.json as MyObject));
 *  });
 *
 *  let dataFromLocalStorage = cache.get('local-storage.name', (item: ItemInterface<string>) => {
 *      item.expiresAfter = 60 * 60 * 24;
 *      return 'Hello, World!';
 *  });
 * ```
 */
export class ChainedCachePool implements CachePoolInterface {

    readonly #cachePools: NamespaceCachePool[];

    constructor(...cachePools: NamespaceCachePool[]) {
        this.#cachePools = cachePools;
    }

    #getNamespaceAndKey(key: string): [string, string] {
        return key.split('.') as [string, string];
    }

    #findCachePoolByNamespace?(namespace: string): CachePoolInterface {
        return this.#cachePools.find(pool => pool.namespace === namespace)
    }

    clear(): void {
        this.#cachePools.forEach(pool => pool.clear());
    }

    delete<T>(key: string): void {
        let n, k: string;
        [n, k] = this.#getNamespaceAndKey(key);
        this.#findCachePoolByNamespace(n)?.delete(k);
    }

    get<T>(key: string, fn: CacheFn<T>): T {
        let n, k: string;
        [n, k] = this.#getNamespaceAndKey(key);
        return this.#findCachePoolByNamespace(n).get(k, fn);
    }

    has(key: string): boolean {
        let n, k: string;
        [n, k] = this.#getNamespaceAndKey(key);
        return this.#findCachePoolByNamespace(n)?.has(k) ?? false;
    }

}

