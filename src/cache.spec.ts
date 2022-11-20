import 'jasmine';
import {NamespaceCachePool, CacheItem, ItemInterface, NamespaceCachePoolInterface, ChainedCachePool} from './cache';
import {FilesystemStorage} from "./filesystem-storage";
import {readdirSync, unlinkSync} from "fs";
import {join as joinPath} from 'path';

describe('CacheItem Class', () => {
    let item: ItemInterface<string> = null;
    beforeEach(() => item = new CacheItem<string>() );
    afterEach(() => item = null);

    it('Get an instance and check its default state (empty).', () => {
        expect(item).toBeTruthy();
        expect(item.value).toBeNull();
        expect(item.hit).toBeTrue();
    });

    it('Set the item\'s value and check its equality and hit.', () => {
        const value = 'my-value';
        item.value = value;
        expect(item.value).toEqual(value);
        expect(item.hit).toBeTrue();
    });

    it('Set the item\'s value and expires after and check that hit is false.', () => {
        const value = 'my-value';
        item.value = value;
        expect(item.value).toEqual(value);
        expect(item.hit).toBeTrue();
        item.expiresAfter = -1;
        expect(item.hit).toBeFalse();
    });

    it('Set the item\'s value and expires after and check that hit is true.', () => {
        const value = 'my-value';
        item.value = value;
        expect(item.value).toEqual(value);
        expect(item.hit).toBeTrue();
        item.expiresAfter = 100;
        expect(item.hit).toBeTrue();
    });

    it('Set the item\'s value and expires at and check that hit is false.', () => {
        const value = 'my-value';
        item.value = value;
        expect(item.value).toEqual(value);
        expect(item.hit).toBeTrue();
        item.expiresAt = new Date();
        expect(item.hit).toBeFalse();
    });
});

describe('NamespaceCachePool Class', () => {

    let cache: NamespaceCachePoolInterface = null;
    const namespace = 'default';

    beforeEach(() => cache = new NamespaceCachePool(namespace));
    afterEach(() => cache = null);

    it('Get an instance and check its default state (empty).', () =>expect(cache).toBeTruthy());
    it(`Verify that the namespace getter returns ${namespace}.`, () => expect(cache.namespace).toEqual(namespace));
    const key = 'my-key';
    const expected = 'my-value';
    it('Add an item to storage and verify the cache function returns that value.', () => {
        const value = cache.get(key, (item: ItemInterface<string>) => expected);
        expect(value).toEqual(expected);
    });
    it('Add an item to storage and set its expires in 5 sec. to verify that the cache hits.', () => {
        const value = cache.get(key, (item: ItemInterface<string>) => {
            item.expiresAfter = 5;
            return expected;
        });
        expect(value).toEqual(expected);
    });
    it('Add an item to storage and set its expires in -5 sec. to verify that the cache does not hits.', () => {
        const value = cache.get(key, (item: ItemInterface<string>) => {
            item.expiresAfter = -5;
            return expected;
        });
        expect(value).toEqual(expected);
    });
    it('Add an item to storage, verify it exists then remove.', () => {
        const value = cache.get(key, (item: ItemInterface<string>) => expected);
        expect(value).toEqual(expected);
        cache.get('test', async (item:object) => {
             return await fetch('').then(response => response.json() as object);
        });
    });
});

describe('ChainedCachePool Class', () => {
    let cache: ChainedCachePool;
    const memory = 'memory';
    const fs = 'fs';
    const path = '/tmp/cache'
    beforeEach(() => cache = new ChainedCachePool(
            new NamespaceCachePool(memory), // default is MapStorage which is in-memory
            new NamespaceCachePool(fs, new FilesystemStorage(path))
        )
    );
    afterEach(() => {
        cache = null
        readdirSync(path, 'utf-8').forEach(file => unlinkSync(joinPath(path, file)));
    });

    it('Save to file system cache', () => {
        const expected = {one: 1, two: 2, three: 300}
        const value = cache.get(`${fs}.my-item`, (item:ItemInterface<{one: number, two: number, three: number}>) => expected);
        expect(value.one).toEqual(expected.one);
        expect(value.two).toEqual(expected.two);
        expect(value.three).toEqual(expected.three);
    });
});