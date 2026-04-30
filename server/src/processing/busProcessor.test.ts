import { describe, it, expect } from 'vitest';
import { processVehicle } from './busProcessor';
import { RawBusEntity } from '../ingestion/gtfsRtIngestion';

describe('Bus Processor Logic', () => {

  it('should correctly return the bus position from a valid raw entity', () => {
    const rawEntity: RawBusEntity = {
      id: '123',
      bus: {
        trip: { tripId: 'trip-timbuktu' },
        position: { latitude: 62.24, longitude: 25.74 },
        timestamp: '1620000000'
      }
    };

    const result = processVehicle(rawEntity);

    expect(result).toEqual(rawEntity.bus);
    expect(result.position?.latitude).toBe(62.24);
  });

  it('should throw an error if vehicle data is missing', () => {
    const brokenEntity = { id: '123' } as unknown as RawBusEntity;

    expect(() => processVehicle(brokenEntity)).toThrow('Vehicle entity missing vehicle data');
  });

  it('should handle partial bus data correctly', () => {
    const partialEntity: RawBusEntity = {
      id: '124',
      bus: {
        position: { latitude: 60.1 }
      }
    };

    const result = processVehicle(partialEntity);
    expect(result.position?.latitude).toBe(60.1);
    expect(result.trip).toBeUndefined();
  });

});