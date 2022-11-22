import 'jasmine';
import {ChainedCachePool, NamespaceCachePool, NamespaceCachePoolInterface} from "./cache";

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
        const value = cache.get<string>(key, () => [expected]);
        expect(value).toEqual(expected);
    });
    it('Add an item to storage and set its expires in 5 sec. to verify that the cache hits.', () => {
        const value = cache.get<string>(key, () => {
            return [expected, (new Date()).getTime() + (5 * 60)];
        });
        expect(value).toEqual(expected);
        const value2 = cache.get<string>(key, () => {
            return [expected, (new Date()).getTime() + 5 * 60];
        });
    });
    it('Add an item to storage and set its expires in -5 sec. to verify that the cache does not hits.', () => {
        const value = cache.get<string>(key, () => {
            return [expected, (new Date()).getTime() - 5];
        });
        expect(value).toEqual(expected);
    });
    it('Add an item to storage, verify it exists then remove.', () => {
        const value = cache.get<string>(key, () => [expected]);
        expect(value).toEqual(expected);
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
        const value = cache.get<TestObj>('default.jsmith', () => [expected]);
        expect(cache.has('default.jsmith')).toBeTrue();
        const value2 = cache.get<TestObj>('ns:1.jsmith', () => [expected]);
        expect(cache.has('ns:1.jsmith')).toBeTrue();
        cache.delete('default.jsmith');
        expect(cache.has('default.jsmith')).toBeFalse();
        expect(cache.has('ns:1.jsmith')).toBeTrue();
    });
});