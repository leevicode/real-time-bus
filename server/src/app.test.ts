import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import { createApp } from './app';
import { createMocks } from 'node-mocks-http';

vi.mock('./api/routes', () => ({ routesRouter: express.Router() }));
vi.mock('./api/stops', () => ({ stopsRouter: express.Router() }));
vi.mock('./api/shapes', () => ({ shapesRouter: express.Router() }));
vi.mock('./api/websocket', () => ({
  setupWebSocket: vi.fn(() => () => {}),
}));

vi.spyOn(express, 'static').mockImplementation(() => (req, res, next) => next());

describe('createApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create an express app with cors, json, and routers', () => {
    const app = createApp('test-api-key');
    expect(app).toBeDefined();
    expect(typeof app.use).toBe('function');
    expect((app as any).cleanup).toBeDefined();
    expect(typeof (app as any).cleanup).toBe('function');
  });

  it('should call setupWebSocket with app and apiKey', async () => {
    const { setupWebSocket } = await import('./api/websocket');
    createApp('my-secret-key');
    expect(setupWebSocket).toHaveBeenCalledTimes(1);
    expect(setupWebSocket).toHaveBeenCalledWith(expect.any(Function), 'my-secret-key');
  });

  it('should call sendFile with index.html for unknown routes', () => {
    const app = createApp('test-key');
    const { req, res } = createMocks({
      method: 'GET',
      url: '/some/nonexistent/path',
    });

    const sendFileMock = vi.fn();
    res.sendFile = sendFileMock;

    app(req, res);

    expect(sendFileMock).toHaveBeenCalledTimes(1);
    expect(sendFileMock.mock.calls[0][0]).toContain('index.html');
  });
});