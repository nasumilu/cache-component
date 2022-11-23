import {MemoryStorage} from "./storage/memory-storage";
import {CachePoolInterface, NamespaceCachePoolInterface, ReplacerFn, ReviverFn, ValueFn} from "./types";

/**
 * A default CachePoolInterface implementation.
 *
 * This class provides the basic (un)marshalling of an item to/from Storage using a replacer and reviver function. The
 * replacer function when not provided, utilizes the `JSON.stringify`, likewise the reviver by default is the
 * `JSON.parse` function.
 *
 * ### Usage
 * ```
 * const cache = new CachePool(); // defaults to MemoryStorage
 * cache.get<Person>(
 *      'my-obj',
 *      () => ({name: 'John Smith', age: 32 })
 * )
 * ```
 * With a replacer and reviver
 * ```
 * cache.get<Person>(
 *      'my-obj',
 *      () => ({name: 'John Smith', age: 32 }),
 *      (p: Person) => JSON.stringify([p.name, p.age]),
 *      (str: string) => {
 *          const unmarshal = JSON.parse(str);
 *          return {name: unmarshal[0], age: unmarshal[1]}
 *      },
 *      new Date('2022-12-31')
 * )
 * ```
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

    get<T>(key: string, value: ValueFn<T> | T, ttl?: number | Date, replacer?: ReplacerFn<T>, reviver?: ReviverFn<T>): T {
        let item = this.#storage.getItem(key);
        const now = (new Date()).getTime();
        ttl = ttl instanceof Date ? ttl.getTime() : ttl;
        if (null === item || (ttl ?? Infinity) < now) {
            value = (value instanceof Function) ? value() : value;
            const replacerFn = replacer != null ? replacer : JSON.stringify;
            this.#storage.setItem(key, replacerFn(value));
            return value;
        }
        const reviverFn = (null != reviver) ? reviver : JSON.parse;
        return reviverFn(item);
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

    private getNamespaceKey(key: string): string {
        return `${this.#namespace}.${key}`;
    }

    override get<T>(key: string, value: ValueFn<T> | T, ttl?: number | Date, replacer?: ReplacerFn<T>, reviver?: ReviverFn<T>): T {
        return super.get(this.getNamespaceKey(key), value, ttl, replacer, reviver);
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
 *      item.expiresAt = (new Date()).getTime() + 3600 * 1000;
 *      return 'Hello, World!';
 *  });
 * ```
 */
export class ChainedCachePool implements CachePoolInterface {

    readonly #cachePools: NamespaceCachePool[];

    constructor(...cachePools: NamespaceCachePool[]) {
        this.#cachePools = cachePools;
    }

    private getNamespaceAndKey(key: string): [string, string] {
        return key.split('.') as [string, string];
    }

    getCachePool(namespace: string): CachePoolInterface | null {
        return (this.#cachePools.find(pool => pool.namespace === namespace) as CachePoolInterface)
    }

    clear(): void {
        this.#cachePools.forEach(pool => pool.clear());
    }

    delete<T>(key: string): void {
        let n, k: string;
        [n, k] = this.getNamespaceAndKey(key);
        const pool = this.getCachePool(n);
        if(null !== pool) {
            pool.delete(k);
        }
    }

    get<T>(key: string, value: ValueFn<T> | T, ttl?: number | Date, replacer?: ReplacerFn<T>, reviver?: ReviverFn<T>): T {
        let n, k: string;
        [n, k] = this.getNamespaceAndKey(key);
        const pool = this.getCachePool(n);
        if(null === pool) {
            throw new Error(`Unknown cache pool for namespace ${n}!`);
        }
        return pool.get(k, value, ttl, replacer, reviver);
    }

    has(key: string): boolean {
        let n, k: string;
        [n, k] = this.getNamespaceAndKey(key);
        const pool = this.getCachePool(n);
        return pool !== null && pool.has(k);
    }

}

