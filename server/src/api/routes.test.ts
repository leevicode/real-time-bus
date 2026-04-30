import { describe, it, expect, vi, beforeEach } from 'vitest';
import httpMocks from 'node-mocks-http';
import express from 'express';
import { EventEmitter } from 'events';
import { routesRouter } from './routes';
import { fetchData } from '../lib/gtfs';

vi.mock('../lib/gtfs', () => ({
  cityToAuthorityId: { 'jyväskylä': '209' },
  fetchData: vi.fn()
}));

vi.mock('../processing/routeProcessor', () => ({
  processRoute: vi.fn((route) => {
    if (!route.route_id) throw new Error('Route missing route_id');
    return route;
  })
}));

describe('Routes API Layer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 if the city is not supported', async () => {
    const app = express();
    app.use('/', routesRouter);
    
    const req = httpMocks.createRequest({ method: 'GET', url: '/timbuktu' });
    const res = httpMocks.createResponse({ eventEmitter: EventEmitter });

    const waitForEnd = new Promise((resolve) => res.on('end', resolve));
    app(req, res);
    await waitForEnd;

    expect(res.statusCode).toBe(400);
    expect(res._getJSONData().error).toBe('City "timbuktu" not supported.');
  });

  it('should return 200 and routes for Jyväskylä', async () => {
    const app = express();
    app.use('/', routesRouter);

    const mockRoutes = [
      { route_id: 'jkl-1', route_short_name: '1', route_long_name: 'Keskusta', route_type: '3' }
    ];
    
    const mockParse = vi.fn().mockResolvedValue(mockRoutes);
    (fetchData as any).mockResolvedValue({ parse: mockParse });

    const req = httpMocks.createRequest({ method: 'GET', url: '/jyväskylä' });
    const res = httpMocks.createResponse({ eventEmitter: EventEmitter });

    const waitForEnd = new Promise((resolve) => res.on('end', resolve));
    app(req, res);
    await waitForEnd;

    expect(res.statusCode).toBe(200);
    const data = res._getJSONData();
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].route_long_name).toBe('Keskusta');
  });

  it('should return 500 if GTFS data fetching fails', async () => {
    const app = express();
    app.use('/', routesRouter);

    (fetchData as any).mockRejectedValue(new Error('Fetch failed'));

    const req = httpMocks.createRequest({ method: 'GET', url: '/jyväskylä' });
    const res = httpMocks.createResponse({ eventEmitter: EventEmitter });

    const waitForEnd = new Promise((resolve) => res.on('end', resolve));
    app(req, res);
    await waitForEnd;

    expect(res.statusCode).toBe(500);
    expect(res._getJSONData().error).toBe('Failed to load routes data.');
  });

  it('should return 500 if route processing fails due to corrupt data', async () => {
    const app = express();
    app.use('/', routesRouter);

    const corruptData = [{ route_short_name: 'Broken' }];
    const mockParse = vi.fn().mockResolvedValue(corruptData);
    (fetchData as any).mockResolvedValue({ parse: mockParse });

    const req = httpMocks.createRequest({ method: 'GET', url: '/jyväskylä' });
    const res = httpMocks.createResponse({ eventEmitter: EventEmitter });

    const waitForEnd = new Promise((resolve) => res.on('end', resolve));
    app(req, res);
    await waitForEnd;

    expect(res.statusCode).toBe(500);
    expect(res._getJSONData().error).toBe('Failed to load routes data.');
  });
});