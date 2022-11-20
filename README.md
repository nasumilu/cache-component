# @nasumilu/cache

This was inspired by [Symfony Cache Component](https://symfony.com/doc/current/components/cache.html).
Often caching turns into some global registry, this paradigm, utilizing this higher level functionality which 
discourages such erroneous practice.


## Usage

### CachePool
```javascript
import {CachePool} from 'cache';

const cache = new CachePool(); // default storage is in-memory

const value = cache.get('my-value', (item) => {
    return 'My Cached Value';
});
```

The default `Storage` is in-memory using the `MemoryStorage` class but any class which implements `Storage` may be
used when constructing the cache pool. For local storage use, 

```javascript
const cache = new CachePool(window.localStorage);
```

It is important to not that the `cache.clear()` will remove **ALL** cached values found in the storage. So if the 
application is using `localStorage` outside of this API those value will also be lost. To avoid this consider using
the `NamespaceCachePool`.

### NamespaceCachePool

```javascript
import {NamespaceCachePool} from 'cache';

const cache = new NamespaceCachePool('default'); // default storage is in-memory

const value = cache.get('my-value', (item) => {
    return 'My Cached Value';
});
```

The namespace cache pool class prefixes all keys with a namespace. So the actual item is stored using the key 
`default.my-value`, but you never need to be concerned as the prefixing is automagically done.

### ChainedCachePool

```javascript
import { ChainedCachePool, NamespaceCachePool } from 'cache';

const cache = new ChainedCachePool(
    new NamespaceCachePool('default'),
    new NamespaceCachePool('local-storage', window.localStorage),
    new NamespaceCachePool('session-storage', window.sessionStorage),
    new NamespaceCachePool('app-local', window.localStorage)
);

const defaultValue = cache.get('default.my-value', item => 'My Cached Value');
const localStorageValue = cache.get('local-storage.my-value', item => 'My Cached Value');
const sessionStorageValue = cache.get('session-storage.my-value', item => 'My Cached Value');
const appLocalValue = cache.get(
    'app-local.fetch-data', 
    async item => {
        item.expiresAfter = 3600; // expire in 1 hour
        return await fetch('https://some.com/api/endpoint').then(response => response.json());
    }
);
```

The chained cache pool may have 1 or more `NamespaceCachePool` objects. In this instance the key **MUST** be prefixed
with the namespace of the target cache pool.