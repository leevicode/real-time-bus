import { RawBusPosition } from '../ingestion/gtfsRtIngestion';

export type Point = [number, number];
export type Shape = Point[]

export interface BusPosition extends RawBusPosition {}

export interface Route {
  route_id: string;
  route_short_name: string;
  route_long_name: string;
  route_type: string;
}

