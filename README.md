# @nasumilu/cache

This was inspired by [Symfony Cache Component](https://symfony.com/doc/current/components/cache.html).
Often caching turns into some global registry, this paradigm, utilizing this higher level functionality which 
discourages such erroneous practice.

## Usage

### CachePool

The default `Storage` is in-memory using the `MemoryStorage` class but any class which implements `Storage` may be
used when constructing the cache pool.


```typescript
import {CachePool} from 'cache';

const cache = new CachePool(); // default storage is in-memory using the MemoryStorage class

const value = cache.get('my-value', 'My Cached Value');
```

To use one of the native web browser storage, simply pass either the `window.localStorage` or `window.sessionStorage`
when constructing a `CachePool`. 

> **IMPORTANT**
> 
> The `cache.clear()` will remove **ALL** cached values in the underlying `Storage`. So if the application is using 
> `window.localStorage` or `window.sessionStorage` outside of this API those value will also be deleted. To avoid this 
> consider using the `NamespaceCachePool`.

```typescript
const cache = new CachePool(window.localStorage);
```

### NamespaceCachePool

The namespace cache pool class prefixes all keys with a namespace. So the actual item, in the example below, is stored
using the key `default.my-value`. The cache namespace is _automagically_ prefix for you, just do things as if you where
using a regular `CachePool`. The important thing is when invoking the `clear` method on an instance of `NamespaceCachePool`
only the items containing that prefixed are removed.

```typescript
import {NamespaceCachePool} from 'cache';

const cache = new NamespaceCachePool('default', window.localStorage);
const value = cache.get('my-value', 'My Cached Value');
```

### ChainedCachePool

The chained cache pool may have 1 or more `NamespaceCachePool` objects. Unlike the above examples, the namespace is 
necessary. It is used to identify the appropriate cache pool, so key **MUST** be prefixed with the namespace of the 
intended cache pool target.

```typescript
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
const endpointData = cache.get(
    'app-local.fetch-data', 
    async item => await fetch('https://some.com/api/endpoint').then(response => response.json())
);
```

- [Using replacer & reviver](./docs/replacer_reviver.md)
- [Using time-to-live (TTL)](./docs/ttl.md)