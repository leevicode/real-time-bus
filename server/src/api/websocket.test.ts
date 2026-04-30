import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import { setupWebSocket } from './websocket';
import { fetchBusPositions } from '../ingestion/gtfsRtIngestion';

vi.mock('../ingestion/gtfsRtIngestion', () => ({
  fetchBusPositions: vi.fn()
}));

vi.mock('../processing/busProcessor', () => ({
  processVehicle: vi.fn(v => v)
}));

const mockSend = vi.fn();
const mockClients = new Set<any>();
const mockWss = { clients: mockClients };

vi.mock('express-ws', () => {
  return {
    default: vi.fn((app: any) => {
      app.ws = vi.fn(); 
      return {
        getWss: () => mockWss
      };
    })
  };
});

describe('WebSocket Layer', () => {
  const apiKey = 'test-api-key';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockClients.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should fetch and broadcast bus positions when clients are connected', async () => {
    const app = express();
    const mockData = [{ id: 'bus-1', lat: 62.2, lng: 25.7 }];
    (fetchBusPositions as any).mockResolvedValue(mockData);

    const client = { readyState: 1, send: mockSend };
    mockClients.add(client);

    const cleanup = setupWebSocket(app, apiKey);

    await vi.advanceTimersByTimeAsync(2000);

    expect(fetchBusPositions).toHaveBeenCalledWith(apiKey);
    expect(mockSend).toHaveBeenCalledWith(JSON.stringify(mockData));

    cleanup();
  });

  it('should not fetch data if no clients are connected', async () => {
    const app = express();
    mockClients.clear();

    const cleanup = setupWebSocket(app, apiKey);
    await vi.advanceTimersByTimeAsync(2000);

    expect(fetchBusPositions).not.toHaveBeenCalled();
    cleanup();
  });

  it('should handle errors in broadcasting without crashing', async () => {
    const app = express();
    mockClients.add({ readyState: 1, send: mockSend });
    (fetchBusPositions as any).mockRejectedValue(new Error('Network error'));

    const cleanup = setupWebSocket(app, apiKey);
    
    await expect(vi.advanceTimersByTimeAsync(2000)).resolves.toBeDefined();
    
    cleanup();
  });
});