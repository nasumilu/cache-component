
type StorageEntry = {
    key: string;
    value: string;
}

export class MemoryStorage implements Storage {

    #storage: Array<StorageEntry> = [];

    get length(): number {
        return this.#storage.length;
    }

    #findIndexFor(key: string): number {
        return this.#storage.findIndex((entry: StorageEntry) => entry?.key === key);
    }

    clear(): void {
        this.#storage = [];
    }

    getItem(key: string): string | null {
        const index = this.#findIndexFor(key);
        let value = null;
        if (-1 !== index) {
            value = this.#storage[index].value;
        }
        return value;
    }

    key(index: number): string | null {
        return this.#storage[index]?.key ?? null;
    }

    removeItem(key: string): void {
        const index = this.#findIndexFor(key);
        if (-1 !== index) {
            this.#storage.splice(index, 1);
        }
    }

    setItem(key: string, value: string): void {
        const index = this.#findIndexFor(key);
        if (-1 !== index) {
            this.#storage[index].value = value;
        } else {
            this.#storage.push({key, value});
        }
    }

}