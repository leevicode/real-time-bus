import { describe, it, expect, vi, beforeEach } from 'vitest';
import fetch from 'node-fetch';
import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import { fetchBusPositions } from '../gtfsRtIngestion';
import { Mock } from 'vitest';

vi.mock('node-fetch');
vi.mock('gtfs-realtime-bindings', () => ({
  default: {
    transit_realtime: {
      FeedMessage: {
        decode: vi.fn(),
      },
    },
  },
}));

describe('fetchBusPositions', () => {
  const mockApiKey = 'test-api-key';
  const mockUrl = 'https://data.waltti.fi/jyvaskyla/api/gtfsrealtime/v1.0/feed/vehicleposition';

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should fetch and decode vehicle positions successfully', async () => {
    const mockArrayBuffer = new ArrayBuffer(8);
    const mockResponse = {
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(mockArrayBuffer),
    };
    (fetch as unknown as Mock).mockResolvedValue(mockResponse);

    const mockFeed = {
      entity: [
        {
          id: 'vehicle_1',
          vehicle: {
            trip: { tripId: 'trip_123', startTime: '10:00', startDate: '20250101' },
            position: { latitude: 60.1, longitude: 24.9, bearing: 90 },
            timestamp: '1735650000',
            bus: { id: 'bus_42', label: 'Bus 42' },
          },
        },
        {
          id: 'vehicle_2',
          vehicle: {
            trip: { tripId: 'trip_456' },
            position: { latitude: 61.2, longitude: 25.3 },
          },
        },
      ],
    };
    (GtfsRealtimeBindings.transit_realtime.FeedMessage.decode as Mock).mockReturnValue(mockFeed);

    const result = await fetchBusPositions(mockApiKey);

    // Assert fetch was called correctly.
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(mockUrl, {
      headers: { Authorization: `Basic ${mockApiKey}` },
    });

    // Assert arrayBuffer was called.
    expect(mockResponse.arrayBuffer).toHaveBeenCalled();

    // Assert decode was called with Uint8Array.
    expect(GtfsRealtimeBindings.transit_realtime.FeedMessage.decode).toHaveBeenCalledWith(
      expect.any(Uint8Array)
    );

    // Assert mapping of entities.
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: 'vehicle_1',
      bus: mockFeed.entity[0].vehicle,
    });
    expect(result[1]).toEqual({
      id: 'vehicle_2',
      bus: mockFeed.entity[1].vehicle,
    });
  });

  it('should throw an error when the fetch response is not ok', async () => {
    const mockResponse = {
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      arrayBuffer: vi.fn(),
    };
    (fetch as unknown as Mock).mockResolvedValue(mockResponse);

    await expect(fetchBusPositions(mockApiKey)).rejects.toThrow(
      'GTFS-RT fetch failed: 401 Unauthorized'
    );
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(mockResponse.arrayBuffer).not.toHaveBeenCalled();
  });

  it('should throw an error if fetch itself fails (network error)', async () => {
    const networkError = new Error('Network failure');
    (fetch as unknown as Mock).mockRejectedValue(networkError);

    await expect(fetchBusPositions(mockApiKey)).rejects.toThrow('Network failure');
  });

  it('should handle empty entity array correctly', async () => {
    const mockArrayBuffer = new ArrayBuffer(0);
    const mockResponse = {
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(mockArrayBuffer),
    };
    (fetch as unknown as Mock).mockResolvedValue(mockResponse);

    const mockFeed = { entity: [] };
    (GtfsRealtimeBindings.transit_realtime.FeedMessage.decode as Mock).mockReturnValue(mockFeed);

    const result = await fetchBusPositions(mockApiKey);
    expect(result).toEqual([]);
  });
});