import {
    PathLike,
    readdirSync,
    unlinkSync,
    readFileSync,
    writeFileSync,
    existsSync,
    mkdirSync
} from "fs";
import {join as joinPath} from 'path';

export class FilesystemStorage implements Storage {

    readonly #path: PathLike;

    public constructor(path: PathLike) {
        this.#path = path;
        if (!existsSync(this.#path)) {
            mkdirSync(this.#path);
        }
    }

    get length(): number {
        return readdirSync(this.#path, 'utf-8').length;
    }

    clear(): void {
        readdirSync(this.#path, 'utf-8').forEach(file => this.removeItem(file));
    }

    getItem(key: string): string | null {
        let item: string = null;
        let filename = readdirSync(this.#path, 'utf-8').find(file => file === key) ?? null;
        if (null != filename) {
            item = readFileSync(joinPath(this.#path as string, filename), 'utf-8');
        }
        return item
    }

    key(index: number): string | null {
        return readdirSync(this.#path)[index];
    }

    removeItem(key: string): void {
        unlinkSync(joinPath(this.#path as string, key));
    }

    setItem(key: string, value: string): void {
        writeFileSync(joinPath(this.#path as string, key), value);
    }

}