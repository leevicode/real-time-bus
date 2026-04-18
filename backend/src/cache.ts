export function cache<T>(constructor: () => Promise<T>): () => Promise<T> {
    let cached: T | undefined;
    return async () => {
        if (cached) {
            console.log("cache hit!");
            return cached;
        }
        console.log("fetching...");
        cached = await constructor();
        console.log("done fetching.")
        return cached;
    }
}

export function cacheParam<T, U>(func: (arg0: T) => Promise<U>): (arg0: T) => Promise<U> {
    let caches: Map<T,U> = new Map();
    return async (params) => {
        const cache = caches.get(params);
        if (cache) {
            console.log("Cache hit!");
            return cache;
        }
        console.log("fetching...");
        const result = await func(params);
        console.log("done fetching.");
        caches.set(params,result);
        return result;
    };
}