# Replacer & Reviver Callbacks

By default, values are (un)marshalled using the built-in `JSON.stringify` and `JSON.parse` static members. However, in 
many cases this built in method may marshal the object but not correctly unmarshall it into the appropriate instances.
For these more complex objects it is necessary to use a replacer and a reviver callback functions to handle this situation. 

The responsibility of a replacer function (`ReplacerFn<T>`) is to marshal an object to a string which is later 
unmarshalled using the reviver function (`ReviverFn<T>`).

## Example

In this example we will use a simple object named `Color` that store four numeric values that represents a rgba color.
Its constructor argument in _typescript_ might could look like this type definition and class.

```typescript
export type ColorLike = { red: number, green: number, blue: number, alpha: number } | [number, number, number, number];

export class Color {

    #value: number[];

    constructor(options?: ColorLike) {
        if (!Array.isArray(options)) {
            options = [options?.red ?? 0, options?.green ?? 0, options?.blue ?? 0, options?.alpha ?? 1]
        }
        this.#value = options;
    }

    get hex(): string {
        return `#${this.#value.slice(0, 3).map(v => v.toString(16)).join('')}`
    }

    get hexa() {
        return `${this.hex}${Math.floor((this.#value[3] * 255)).toString(16)}`
    }

    get rgb() {
        return `rgb(${this.#value.slice(0, 3).map(v => v.toString()).join(', ')})`;
    }

    get rgba() {
        return this.rgb.replace('rgb', 'rgba')
            .replace(')', `, ${this.#value[3]})`);
    }

    get red(): number {
        return this.#value[0];
    }

    set red(value: number) {
        this.#value[0] = value;
    }

    get green(): number {
        return this.#value[1];
    }

    set green(value: number) {
        this.#value[1] = value;
    }

    get blue(): number {
        return this.#value[2];
    }

    set blue(value: number) {
        this.#value[2] = value;
    }

    get alpha(): number {
        return this.#value[3];
    }

    set alpha(value: number) {
        this.#value[3] = value;
    }

    stringify(): string {
        return JSON.stringify(this.#value);
    }

    static parse(str: string): Color {
        const values = (JSON.parse(str) as ColorLike);
        return new Color(values);
    }
}
```

To store an instance of `Color` into `Storage` requires a replacer and a reviver callback which are provided by the 
`Color` classes `stringify` and static `Color.parse` member functions, in the example below. 

```typescript
const cache = new ChainedCachePool(
      new NamespaceCachePool('local', window.localStorage),
      new NamespaceCachePool('session', window.sessionStorage),
      new NamespaceCachePool('memory')
    );

let color = new Color([51, 102, 153, 1])

color = cache.get<Color>(
    'local.favorite-color',
    color,
    Infinity, // ttl of null | undefined = Infinity
    color.stringify.bind(this.#color),
    Color.parse
);
```

The cache is an instance of `ChainedCachePool` which requires each cached item to be prefixed with a known namespace. In
this example the object is stored _window.localStorage_ and will persist across page visits or until the browser cache is
cleared the cache's `clear` method is invoked. Basically, the marshalled `Color` instance is stored under the key `local.favorite-color`.

When storing the object the replacer object is invoked. The replacer function accepts at least one argument, the value to 
replace as a string. However, in this example we are just binding it to (creating a Closure) to the current colors `stringify`
member function (method for the Java folks). Since scope is impossible to maintain for unmarshalling the data from storage
the static member function `Color.parse` is used to turn the string back into an instance of `Color`.

Since a color found in the cache storage does not have a TTl or its TTL is forever, it is retrieved, otherwise the `color`
provided as the second argument is persisted into storage and then returned. Give the namespace storage is _local_ and it 
is configured to persist in `localStorage` the color value is loaded from storage upon the next page visit.

