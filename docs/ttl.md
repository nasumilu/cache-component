# Time-to-Live (TTL)

An important aspect of caching is exactly how long does an _item_ live. This is controlled by the `ttl` parameter, which
may be a valid Unix timestamp or an instance of `Date`.

Utilizing the color example found under the [Replacer & Reviver Callbacks](replacer_reviver.md) documentation, to add
a TTL to the cached color object is very simple.
 
```typescript
let color = new Color([51, 102, 153, 1])

color = cache.get<Color>(
'local.favorite-color',
color,
new Date('P2099-12-31T23:59:59'), // or 4102419599
color.stringify.bind(this.#color),
Color.parse
);
```

The given color is cached until midnight on _2022-12-31_