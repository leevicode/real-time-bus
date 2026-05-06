import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import httpMocks from 'node-mocks-http';
import express from 'express';
import { EventEmitter } from 'events';
import { stopsRouter } from './stops';
import { fetchData } from '../lib/gtfs';

vi.mock('../lib/gtfs', () => ({
  cityToAuthorityId: { 'jyväskylä': '209' },
  fetchData: vi.fn()
}));

describe('Stops API Layer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-29T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return 200 and formatted stops for Jyväskylä', async () => {
    const app = express();
    app.use('/', stopsRouter);

    const mockRawStops = [
      { stop_id: 'S1', stop_name: 'Keskusta', stop_lat: '62.24', stop_lon: '25.74', location_type: '0' }
    ];
    
    const mockParse = vi.fn().mockResolvedValue(mockRawStops);
    (fetchData as any).mockResolvedValue({ parse: mockParse });

    const req = httpMocks.createRequest({ method: 'GET', url: '/jyväskylä' });
    const res = httpMocks.createResponse({ eventEmitter: EventEmitter });

    const waitForEnd = new Promise((resolve) => res.on('end', resolve));
    app(req, res);
    await waitForEnd;

    expect(res.statusCode).toBe(200);
    const data = res._getJSONData();
    expect(data[0].lat).toBe(62.24);
    expect(data[0].name).toBe('Keskusta');
  });

  it('should return 200 and routes for a specific stop with arrival minutes', async () => {
    const app = express();
    app.use('/', stopsRouter);

    const mockParse = vi.fn().mockImplementation((fileName: string) => {
      if (fileName === "stop_times.txt") 
        return Promise.resolve([{ stop_id: 'S1', trip_id: 'T1', arrival_time: '12:10:00' }]);
      if (fileName === "trips.txt") 
        return Promise.resolve([{ trip_id: 'T1', route_id: 'R1' }]);
      if (fileName === "routes.txt") 
        return Promise.resolve([{ route_id: 'R1', route_short_name: '1', route_long_name: 'Keskusta' }]);
      return Promise.resolve([]);
    });

    (fetchData as any).mockResolvedValue({ parse: mockParse });

    const req = httpMocks.createRequest({ method: 'GET', url: '/stop-routes/jyväskylä/S1' });
    const res = httpMocks.createResponse({ eventEmitter: EventEmitter });

    const waitForEnd = new Promise((resolve) => res.on('end', resolve));
    app(req, res);
    await waitForEnd;

    expect(res.statusCode).toBe(200);
    const data = res._getJSONData();
    expect(data[0].next_arrival_minutes).toBe(10);
  });
});