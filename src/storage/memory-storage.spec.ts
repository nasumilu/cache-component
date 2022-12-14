import 'jasmine';
import {MemoryStorage} from "./memory-storage";

describe('Memory Storage Class', () => {

    let storage: Storage;
    const key = 'my-key';

    beforeEach(() => storage = new MemoryStorage());
    afterEach(() => storage = null);

    it('Get an instance and check its default state (empty).', () => {
        expect(storage).toBeTruthy();
        expect(storage.length).toEqual(0);
    });
    it(
        `Store a value with key ${key}, check the value equality, and the storage length`, () => {
            const expected = 'my-value';
            storage.setItem(key, expected);
            expect(storage.getItem(key)).toEqual(expected);
            expect(storage.length).toEqual(1);
        }
    );

    it(
        `Store a value at key ${key}, then check its existence, clear and verify that it has been removed.`, () => {
            storage.setItem(key, 'some value');
            expect(storage.getItem(key)).not.toBeNull();
            storage.clear();
            expect(storage.getItem(key)).toBeNull();
        }
    );

    it(
        `Store a value at key ${key}, then retrieve it by index 0.`, () => {
            storage.setItem(key, 'my-value');
            expect(storage.key(0)).toEqual(key);
        }
    );

    it(`Store a value at key ${key}, then remove the item.`, () => {
        storage.setItem(key, 'my-value');
        expect(storage.getItem(key)).not.toBeNull();
        storage.removeItem(key);
        expect(storage.getItem(key)).toBeNull();

    });


});