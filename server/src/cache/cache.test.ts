import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cache, cacheParam } from './cache';

describe('Caching Library', () => {

  describe('cache parameterless', () => {
    it('should call the constructor only once', async () => {
      const mockConstructor = vi.fn(async () => ({ data: 'test' }));
      const getCachedData = cache(mockConstructor);

      const res1 = await getCachedData();
      const res2 = await getCachedData();
      const res3 = await getCachedData();

      expect(mockConstructor).toHaveBeenCalledTimes(1);
      expect(res1).toEqual({ data: 'test' });
      expect(res1).toBe(res2);
      expect(res2).toBe(res3);
    });

    it('should handle async execution correctly', async () => {
      const slowConstructor = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'slow-data';
      };
      
      const getCachedData = cache(slowConstructor);
      const result = await getCachedData();
      
      expect(result).toBe('slow-data');
    });
  });

  describe('cacheParam with arguments', () => {
    it('should cache results based on the parameter', async () => {
      const mockFunc = vi.fn(async (id: string) => `result-for-${id}`);
      const getCachedData = cacheParam(mockFunc);

      const resA1 = await getCachedData('A');
      const resA2 = await getCachedData('A');

      const resB = await getCachedData('B');

      expect(mockFunc).toHaveBeenCalledTimes(2);
      expect(resA1).toBe('result-for-A');
      expect(resA2).toBe('result-for-A');
      expect(resB).toBe('result-for-B');
    });

    it('should distinguish between different types of params', async () => {
      const mockFunc = vi.fn(async (n: number) => n * 2);
      const getCachedData = cacheParam(mockFunc);

      await getCachedData(10);
      await getCachedData(20);
      await getCachedData(10);

      expect(mockFunc).toHaveBeenCalledTimes(2);
      expect(await getCachedData(10)).toBe(20);
    });
  });
});