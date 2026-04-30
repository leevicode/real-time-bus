import { describe, it, expect, vi, beforeEach } from 'vitest';
import httpMocks from 'node-mocks-http';
import express from 'express';
import { EventEmitter } from 'events';
import { shapesRouter } from './shapes';
import { fetchData, shapeProcessor } from '../lib/gtfs';

vi.mock('../lib/gtfs', () => ({
  cityToAuthorityId: { 'jyväskylä': '209' },
  fetchData: vi.fn(),
  shapeProcessor: vi.fn()
}));

describe('Shapes API Layer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 if the city is not supported', async () => {
    const app = express();
    app.use('/', shapesRouter);
    const req = httpMocks.createRequest({ method: 'GET', url: '/timbuktu/1' });
    const res = httpMocks.createResponse({ eventEmitter: EventEmitter });

    const waitForEnd = new Promise((resolve) => res.on('end', resolve));
    app(req, res);
    await waitForEnd;

    expect(res.statusCode).toBe(400);
    expect(res._getJSONData().error).toBe('City "timbuktu" not supported.');
  });

  it('should return 200 and shapes for Jyväskylä', async () => {
    const app = express();
    app.use('/', shapesRouter);

    const mockTrips = [{ route_id: '1', trip_id: 't1', shape_id: 's1' }];
    const mockRawShapes = [{ shape_id: 's1', shape_pt_lat: 62.24, shape_pt_lon: 25.74, shape_pt_sequence: 1 }];
    const processedShape = [[62.24, 25.74]];

    const mockParse = vi.fn().mockImplementation((fileName: string) => {
      if (fileName === "trips.txt") return Promise.resolve(mockTrips);
      if (fileName === "shapes.txt") return Promise.resolve(mockRawShapes);
      return Promise.resolve([]);
    });

    (fetchData as any).mockResolvedValue({ parse: mockParse });
    (shapeProcessor as any).mockResolvedValue(processedShape);

    const req = httpMocks.createRequest({ method: 'GET', url: '/jyväskylä/1' });
    const res = httpMocks.createResponse({ eventEmitter: EventEmitter });

    const waitForEnd = new Promise((resolve) => res.on('end', resolve));
    app(req, res);
    await waitForEnd;

    expect(res.statusCode).toBe(200);
    const data = res._getJSONData();
    expect(data.shapes).toEqual(processedShape);
  });

  it('should return 404 if shape processing fails', async () => {
    const app = express();
    app.use('/', shapesRouter);

    const mockParse = vi.fn().mockResolvedValue([]);
    (fetchData as any).mockResolvedValue({ parse: mockParse });
    
    (shapeProcessor as any).mockRejectedValue(new Error("No shape points found for this route."));

    const req = httpMocks.createRequest({ method: 'GET', url: '/jyväskylä/999' });
    const res = httpMocks.createResponse({ eventEmitter: EventEmitter });

    const waitForEnd = new Promise((resolve) => res.on('end', resolve));
    app(req, res);
    await waitForEnd;

    expect(res.statusCode).toBe(404);
    expect(res._getJSONData().error).toBe("No shape points found for this route.");
  });
});