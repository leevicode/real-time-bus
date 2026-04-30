import { describe, it, expect } from 'vitest';
import { processRoute } from './routeProcessor';
import { Route } from '../types';

describe('Route Processor Logic', () => {

  it('should return the route object if it has a valid route_id', () => {
    const validRoute: Route = {
      route_id: '1',
      route_short_name: '1',
      route_long_name: 'Keskusta - Sairaala',
      route_type: '3'
    };
    const result = processRoute(validRoute);

    expect(result).toEqual(validRoute);
    expect(result.route_id).toBe('1');
  });

  it('should throw an error if route_id is missing', () => {
    const brokenRoute = {
      route_short_name: '99'
    } as unknown as Route;

    expect(() => processRoute(brokenRoute)).toThrow('Route missing route_id');
  });

  it('should handle empty string as a missing route_id', () => {
    const emptyIdRoute = {
      route_id: '',
      route_short_name: 'Empty'
    } as unknown as Route;

    expect(() => processRoute(emptyIdRoute)).toThrow('Route missing route_id');
  });

});