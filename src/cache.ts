import {MemoryStorage} from "./storage/memory-storage";


/**
 * The CacheItem type as a tuple with the first element required as the cached value and an optional second number which
 * is the item's TTL as a Unix timestamp
 *
 * ## Examples
 *
 * ```
 * ['foo-bar'] // cache the string 'foo-bar' infinitely
 * ['foo-bar', 1669111468] // cache the string 'foo-bar' until Tue Nov 22 2022 10:04:28 GMT+0000
 * ```
 */
export type CacheItem<T> = [T, number?];

/**
 * A callback function used to obtain a value when the cache false to hit.
 * <br>
 * This function is invoked when the following conditions exist:
 *
 * 1. When no No item exists in the cache
 * 2. An item exists but its TTL has expired (now > TTL)
 */
export type CacheFn<T> = () => CacheItem<T>;

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
     * cache.get<FooBar>('foo-bar', () => [{foo: 'bar'}];
     * cache.get<FooBar>('foo-bar', () => [{foo: 'bar'}, 1669111468];
     * ```
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
    private readonly _storage: Storage;

    /**
     * Constructs a CachePool
     * @param storage
     */
    constructor(storage?: Storage) {
        this._storage = storage ?? new MemoryStorage();
    }

    get storage(): Storage {
        return this._storage;
    }


    /**
     * Gets a CachedItem for a specific key.
     * @param key The key used to store the CachedItem
     * @private
     */
    private getItem<T>(key: string): CacheItem<T> | null{
        let item = this._storage.getItem(key);
        if (null == item) {
            return null;
        }
        return JSON.parse(item) as CacheItem<T>;
    }

    get<T>(key: string, fn: CacheFn<T>): T {
        let item = this.getItem<T>(key);
        let now = new Date().getTime();
        if (null === item || (item[1] ?? Infinity) < now) {
            item = fn();
            this._storage.setItem(key, JSON.stringify(item));
        }
        return item[0];
    }

    delete<T>(key: string): void {
        this._storage.removeItem(key);
    }

    has(key: string): boolean {
        return null != this._storage.getItem(key);
    }

    clear(): void {
        this._storage.clear();
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
    private readonly _namespace: string;

    /**
     * Constructs a NamedCachePool
     * @param namespace the namespace for the
     * @param storage
     */
    constructor(namespace: string, storage?: Storage) {
        super(storage ?? new MemoryStorage());
        this._namespace = namespace;
    }

    get namespace(): string {
        return this._namespace;
    }

    private getNamespaceKey(key: string): string {
        return `${this._namespace}.${key}`;
    }

    override get<T>(key: string, fn: CacheFn<T>): T {
        return super.get(this.getNamespaceKey(key), fn);
    }

    override delete<T>(key: string): void {
        super.delete(this.getNamespaceKey(key));
    }

    override has(key: string): boolean {
        return super.has(this.getNamespaceKey(key));
    }

    override clear(): void {
        let keys: string[] = [];
        for (let i = 0; i < this.storage.length; i++) {
            const key = this.storage.key(i);
            if (key?.includes(this._namespace)) {
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
 *      item.expiresAt = (new Date()).getTime() + 3600 * 1000;
 *      return 'Hello, World!';
 *  });
 * ```
 */
export class ChainedCachePool implements CachePoolInterface {

    private readonly _cachePools: NamespaceCachePool[];

    constructor(...cachePools: NamespaceCachePool[]) {
        this._cachePools = cachePools;
    }

    private getNamespaceAndKey(key: string): [string, string] {
        return key.split('.') as [string, string];
    }

    getCachePool(namespace: string): CachePoolInterface | null {
        return (this._cachePools.find(pool => pool.namespace === namespace) as CachePoolInterface)
    }

    clear(): void {
        this._cachePools.forEach(pool => pool.clear());
    }

    delete<T>(key: string): void {
        let n, k: string;
        [n, k] = this.getNamespaceAndKey(key);
        const pool = this.getCachePool(n);
        if(null !== pool) {
            pool.delete(k);
        }
    }

    get<T>(key: string, fn: CacheFn<T>): T {
        let n, k: string;
        [n, k] = this.getNamespaceAndKey(key);
        const pool = this.getCachePool(n);
        if(null === pool) {
            throw new Error(`Unknown cache pool for namespace ${n}!`);
        }
        return pool.get(k, fn);
    }

    has(key: string): boolean {
        let n, k: string;
        [n, k] = this.getNamespaceAndKey(key);
        const pool = this.getCachePool(n);
        return pool !== null && pool.has(k);
    }

}

