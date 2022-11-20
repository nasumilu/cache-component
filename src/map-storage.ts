/**
 * Basic `in-memory` cache adapter.
 *
 * This adapter uses the native `Map` object to store the items into memory. It is extremely fast but only persists
 * during runtime. As such, any cached items with a TTL greater than the actual execution time are lost.
 */
export class MapStorage implements Storage {

    /**
     * The `Map` to store cache items.
     * @private
     */
    #storage = new Map();

    get length(): number {
        return this.#storage.size;
    }

    clear(): void {
        this.#storage.clear();
    }

    getItem(key: string): string | null {
        return this.#storage.get(key) ?? null;
    }

    key(index: number): string | null {
        return Array.from(this.#storage.keys())[index] ?? null;
    }

    removeItem(key: string): void {
        this.#storage.delete(key);
    }

    setItem(key: string, value: string): void {
        this.#storage.set(key, value);
    }

}