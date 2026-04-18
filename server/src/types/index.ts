export interface RawBusPosition {
  trip?: { tripId?: string; startTime?: string; startDate?: string };
  position?: { latitude?: number; longitude?: number; bearing?: number };
  timestamp?: string;
  bus?: { id?: string; label?: string };
}

export interface RawBusEntity {
  id: string;
  bus: RawBusPosition;
}

export interface BusPosition extends RawBusPosition {}

export interface Route {
  route_id: string;
  route_short_name: string;
  route_long_name: string;
  route_type: string;
}