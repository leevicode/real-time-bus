import { describe, it, expect } from 'vitest';
import { processShapes } from './shapeProcessor';
import { RawTrip, RawShape } from '../ingestion/staticGtfsIngestion';

describe('Shape Processor Logic', () => {

  const mockTrips: RawTrip[] = [
    { route_id: 'R1', trip_id: 'T1', shape_id: 'S1' },
    { route_id: 'R1', trip_id: 'T2', shape_id: 'S1' },
    { route_id: 'R2', trip_id: 'T3', shape_id: 'S2' }
  ];

  const mockShapes: RawShape[] = [
    { shape_id: 'S1', shape_pt_lat: 60.2, shape_pt_lon: 24.2, shape_pt_sequence: 2 },
    { shape_id: 'S1', shape_pt_lat: 60.1, shape_pt_lon: 24.1, shape_pt_sequence: 1 },
    { shape_id: 'S1', shape_pt_lat: 60.3, shape_pt_lon: 24.3, shape_pt_sequence: 3 },
    { shape_id: 'S2', shape_pt_lat: 61.0, shape_pt_lon: 25.0, shape_pt_sequence: 1 }
  ];

  it('should filter, group and sort shape points correctly', async () => {
    const result = await processShapes('R1', mockTrips, mockShapes);

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveLength(3);

    expect(result[0][0]).toEqual([60.1, 24.1]);
    expect(result[0][1]).toEqual([60.2, 24.2]);
    expect(result[0][2]).toEqual([60.3, 24.3]);
  });

  it('should handle multiple shape IDs for a single route', async () => {
    const multiTrips: RawTrip[] = [
      ...mockTrips,
      { route_id: 'R1', trip_id: 'T4', shape_id: 'S3' }
    ];
    const multiShapes: RawShape[] = [
      ...mockShapes,
      { shape_id: 'S3', shape_pt_lat: 62.0, shape_pt_lon: 26.0, shape_pt_sequence: 1 }
    ];

    const result = await processShapes('R1', multiTrips, multiShapes);
    expect(result).toHaveLength(2);
  });

  it('should reject if trips data is empty', async () => {
    await expect(processShapes('R1', [], mockShapes))
      .rejects.toBe('Trips data missing for this city.');
  });

  it('should reject if shapes data is empty', async () => {
    await expect(processShapes('R1', mockTrips, []))
      .rejects.toBe('Shapes data missing for this city.');
  });

  it('should reject if no shapes are found for the given route', async () => {
    await expect(processShapes('NON-EXISTENT', mockTrips, mockShapes))
      .rejects.toBe('No shape points found for this route.');
  });

});