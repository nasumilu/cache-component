import 'jasmine';
import {ChainedCachePool, NamespaceCachePool} from "./cache";
import {NamespaceCachePoolInterface} from "./types";

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
        const value = cache.get<string>(key, expected);
        expect(value).toEqual(expected);
    });
    it('Add an item to storage and set its expires in 5 sec. to verify that the cache hits.', () => {
        const value = cache.get<string>(key, expected, (new Date()).getTime() + (5 * 1000));
        expect(value).toEqual(expected);
        cache.get<void>(key, () => fail('Should not be called'), (new Date()).getTime() + (5 * 1000));
    });

    it('Add an item to storage and set its expires in -5 sec. to verify that the cache does not hits.', () => {
        const value = cache.get<string>(key, expected, (new Date()).getTime() - (5 * 1000));
        expect(value).toEqual(expected);
        expect('success').toEqual(cache.get<string>(key, () => 'success', (new Date()).getTime() - (5 * 1000)));
    });
    it('Add an item to storage, verify it exists then remove.', () => {
        const value = cache.get<string>(key, expected);
        expect(value).toEqual(expected);
        cache.delete<string>(key);
        expect(cache.has(key)).toBeFalse();
    });

    it('Add an item to storage with Date object ttl', () => {
        const value = cache.get<{test: string}>('ttl-date', () => ({test: expected }), new Date('2100-12-31'));
        expect(cache.has('ttl-date')).toBeTrue();
        cache.get<void>(
            'ttl-date',
            () => fail('not expected'),
            new Date('2100-12-31')
        );
    });

    it('Add an item to storage with expired Date object ttl', () => {
        const value = cache.get<{test: string}>('ttl-date', () => ({test: expected }), new Date('1900-12-31'));
        expect(cache.has('ttl-date')).toBeTrue();
        cache.get<void>(
            'ttl-date',
            () => expect(true).toBeTrue(),
            new Date('1900-12-31')
        );
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
        const value = cache.get<TestObj>('default.jsmith', expected);
        expect(cache.has('default.jsmith')).toBeTrue();
        const value2 = cache.get<TestObj>('ns:1.jsmith', expected);
        expect(cache.has('ns:1.jsmith')).toBeTrue();
        cache.delete('default.jsmith');
        expect(cache.has('default.jsmith')).toBeFalse();
        expect(cache.has('ns:1.jsmith')).toBeTrue();
    });
});