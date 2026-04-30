import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { processStops, processStopRoutes } from './stopProcessor';

describe('Stop Processor Logic', () => {

  describe('processStops', () => {
    it('should filter only bus stops (0) or stations (1) and parse floats', () => {
      const raw = [
        { stop_id: '1', stop_name: 'Pysäkki1', stop_lat: '62.1', stop_lon: '25.1', location_type: '0', stop_code: '123' },
        { stop_id: '2', stop_name: 'Pysäkki2', stop_lat: '62.2', stop_lon: '25.2', location_type: '1' },
        { stop_id: '3', stop_name: 'Pysäkki3', stop_lat: '62.3', stop_lon: '25.3', location_type: '2' }
      ];

      const result = processStops(raw as any);

      expect(result).toHaveLength(2);
      expect(result[0].lat).toBe(62.1);
      expect(result.map(s => s.id)).not.toContain('3');
    });
  });

  describe('processStopRoutes', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-04-29T12:00:00'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should calculate minutes correctly for a future arrival', () => {
      const stopTimes = [{ stop_id: 'S1', trip_id: 'T1', arrival_time: '12:15:00' }];
      const trips = [{ trip_id: 'T1', route_id: 'R1' }];
      const routes = [{ route_id: 'R1', route_short_name: '1', route_long_name: 'Runkolinja' }];

      const result = processStopRoutes('S1', stopTimes as any, trips as any, routes as any);

      expect(result[0].next_arrival_minutes).toBe(15);
    });

    it('should pick the earliest future arrival if multiple trips exist', () => {
      const stopTimes = [
        { stop_id: 'S1', trip_id: 'T1', arrival_time: '12:40:00' },
        { stop_id: 'S1', trip_id: 'T2', arrival_time: '12:10:00' }
      ];
      const trips = [
        { trip_id: 'T1', route_id: 'R1' },
        { trip_id: 'T2', route_id: 'R1' }
      ];
      const routes = [{ route_id: 'R1', route_short_name: '1', route_long_name: 'Runkolinja' }];

      const result = processStopRoutes('S1', stopTimes as any, trips as any, routes as any);

      expect(result[0].next_arrival_minutes).toBe(10);
    });

    it('should handle next day logic if arrival is earlier than current time', () => {
      const stopTimes = [{ stop_id: 'S1', trip_id: 'T1', arrival_time: '01:00:00' }];
      const trips = [{ trip_id: 'T1', route_id: 'R1' }];
      const routes = [{ route_id: 'R1', route_short_name: '1', route_long_name: 'Superlinkki' }];

      const result = processStopRoutes('S1', stopTimes as any, trips as any, routes as any);

      expect(result[0].next_arrival_minutes).toBe(780);
    });

    it('should return null for arrival if no trips match the route at this stop', () => {
      const stopTimes = [{ stop_id: 'S1', trip_id: 'T1', arrival_time: '12:10:00' }];
      const trips = [{ trip_id: 'T1', route_id: 'R1' }];
      const routes = [
        { route_id: 'R1', route_short_name: '1', route_long_name: 'A' },
        { route_id: 'R2', route_short_name: '2', route_long_name: 'B' }
      ];

      const result = processStopRoutes('S1', stopTimes as any, trips as any, routes as any);

      expect(result).toHaveLength(1);
      expect(result[0].route_id).toBe('R1');
    });
  });
});