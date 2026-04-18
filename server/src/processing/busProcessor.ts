import { RawBusEntity, BusPosition } from '../types';

// TODO add validation, filtering, enrichment here.
export function processVehicle(raw: RawBusEntity): BusPosition {
  if (!raw.bus) throw new Error('Vehicle entity missing vehicle data');
  return raw.bus;
}