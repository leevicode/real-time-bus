export function cache<T>(constructor: () => Promise<T>): () => Promise<T> {
    let cached: T | undefined;
    return async () => {
        if (cached) {
            return cached;
        }
        cached = await constructor();
        return cached;
    }
}

export function cacheParam<T, U>(func: (arg0: T) => Promise<U>): (arg0: T) => Promise<U> {
    let caches: Map<T, U> = new Map();
    return async (params) => {
        const cache = caches.get(params);
        if (cache) {
            return cache;
        }
        const result = await func(params);
        caches.set(params, result);
        return result;
    };
}

