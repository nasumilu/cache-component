import 'jasmine';
import {CacheItem, ChainedCachePool, ItemInterface, NamespaceCachePool, NamespaceCachePoolInterface} from "./cache";
import arrayWithExactContents = jasmine.arrayWithExactContents;

describe('CacheItem Class', () => {
    let item: ItemInterface<string> = null;
    beforeEach(() => item = new CacheItem<string>() );
    afterEach(() => item = null);

    it('Get an instance and check its default state (empty).', () => {
        expect(item).toBeTruthy();
        expect(item.value).toBeNull();
        expect(item.isExpired).toBeFalse();
    });

    it('Set the item\'s value and check its equality and hit.', () => {
        const value = 'my-value';
        item.value = value;
        expect(item.value).toEqual(value);
        expect(item.isExpired).toBeFalse();
    });

    it('Set the item\'s value and expires after and check that hit is false.', () => {
        const value = 'my-value';
        item.value = value;
        expect(item.value).toEqual(value);
        expect(item.isExpired).toBeFalse();
        item.expiresAfter = -1;
        expect(item.isExpired).toBeTrue();
    });

    it('Set the item\'s value and expires after and check that isExpired is true.', () => {
        const value = 'my-value';
        item.value = value;
        expect(item.value).toEqual(value);
        expect(item.isExpired).toBeFalse();
        item.expiresAfter = 100;
        expect(item.isExpired).toBeFalse();
    });

    it('Set the item\'s value and expires at and check that isExpired is false.', () => {
        const value = 'my-value';
        item.value = value;
        expect(item.value).toEqual(value);
        expect(item.isExpired).toBeFalse();
        item.expiresAt = new Date('1968-01-01');
        expect(item.isExpired).toBeTrue();
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
            item.expiresAfter = 5 * 60;
            return expected;
        });
        expect(value).toEqual(expected);
        const value2 = cache.get(key, (item: ItemInterface<string>) => {
            item.expiresAfter = 5 * 60;
            return expected;
        });
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
    beforeAll(() => cache = new ChainedCachePool(
            new NamespaceCachePool('default'),
            new NamespaceCachePool('ns:1'), // default is MemoryStorage which is in-memory
            new NamespaceCachePool('ns:2')
        )
    );
    afterAll(() => {
        cache.clear();
        cache = null;
    });

    type TestObj = {first: string, last: string, age: number};

    it('Save to file system cache', () => {
        const expected: TestObj = { first: 'John', last: 'Smith', age: 32};
        const value = cache.get('default.jsmith', (item:ItemInterface<TestObj>) => expected);
        expect(cache.has('default.jsmith')).toBeTrue();
        const value2 = cache.get('ns:1.jsmith', (item:ItemInterface<TestObj>) => expected);
        expect(cache.has('ns:1.jsmith')).toBeTrue();
        cache.delete('default.jsmith');
        expect(cache.has('default.jsmith')).toBeFalse();
        expect(cache.has('ns:1.jsmith')).toBeTrue();
    });
});