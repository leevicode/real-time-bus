export interface RawStop {
  stop_id: string;
  stop_code: string;
  stop_name: string;
  stop_lat: string;
  stop_lon: string;
  location_type: string;
}

export interface ProcessedStop {
  id: string;
  name: string;
  lat: number;
  lon: number;
  code?: string;
  locationType?: string;
}

export interface RawStopTime {
  trip_id: string;
  stop_id: string;
  arrival_time: string;
  departure_time: string;
  stop_sequence: string;
}

export interface RawTrip {
  trip_id: string;
  route_id: string;
}

export interface RouteInfo {
  route_id: string;
  route_short_name: string;
  route_long_name: string;
}

export interface StopRouteInfo {
  route_id: string;
  route_short_name: string;
  route_long_name: string;
  next_arrival_minutes: number | null;
}

/**
 * Filter raw stops to only actual bus stops (location_type 0 or 1)
 * and map to a clean structure.
 */
export function processStops(rawStops: RawStop[]): ProcessedStop[] {
  return rawStops
    .filter(stop => stop.location_type === '0' || stop.location_type === '1')
    .map(stop => ({
      id: stop.stop_id,
      name: stop.stop_name,
      lat: parseFloat(stop.stop_lat),
      lon: parseFloat(stop.stop_lon),
      code: stop.stop_code || undefined,
      locationType: stop.location_type,
    }));
}

/**
 * Given a stop_id, raw stop_times, trips, and routes,
 * return an array of routes with the next arrival minutes (or null).
 */
export function processStopRoutes(
  stopId: string,
  stopTimesRaw: RawStopTime[],
  tripsRaw: RawTrip[],
  routesRaw: RouteInfo[]
): StopRouteInfo[] {
  // Find all trip_ids that stop at the given stop_id.
  const myStopTimes = stopTimesRaw.filter(st => st.stop_id === stopId);
  const tripIdsForStop = new Set(myStopTimes.map(st => st.trip_id));

  // Map trip_id -> route_id.
  const tripToRoute = new Map(tripsRaw.map(trip => [trip.trip_id, trip.route_id]));

  // Collect unique route_ids.
  const routeIds = new Set<string>();
  for (const tripId of tripIdsForStop) {
    const routeId = tripToRoute.get(tripId);
    if (routeId) routeIds.add(routeId);
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // GTFS time string helper.
  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // For each route, find earliest future arrival time at this stop.
  const routeNextArrival = new Map<string, number>();

  for (const st of myStopTimes) {
    const tripId = st.trip_id;
    const routeId = tripToRoute.get(tripId);
    if (!routeId || !routeIds.has(routeId)) continue;

    let tripMinutes = timeToMinutes(st.arrival_time);
    // If the scheduled time is earlier than now, it's the next day.
    if (tripMinutes < currentMinutes) {
      tripMinutes += 24 * 60;
    }
    const minsUntil = tripMinutes - currentMinutes;

    const existing = routeNextArrival.get(routeId);
    if (existing === undefined || minsUntil < existing) {
      routeNextArrival.set(routeId, minsUntil);
    }
  }

  // Build response for each unique route.
  const result: StopRouteInfo[] = [];
  for (const route of routesRaw) {
    if (routeIds.has(route.route_id)) {
      result.push({
        route_id: route.route_id,
        route_short_name: route.route_short_name,
        route_long_name: route.route_long_name,
        next_arrival_minutes: routeNextArrival.get(route.route_id) ?? null,
      });
    }
  }
  return result;
}