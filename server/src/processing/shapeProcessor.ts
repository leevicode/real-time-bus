import { Zip, RawShape, RawTrip } from "../ingestion/staticGtfsIngestion";
import { Shape } from "../types";

export async function processShapes(routeId: string, trips: RawTrip[], shapesRaw: RawShape[]): Promise<Shape[]> {
      if (trips.length === 0) {
        return Promise.reject("Trips data missing for this city." );
      }
      if (shapesRaw.length === 0) {
        return Promise.reject("Shapes data missing for this city." );
      }

      // Find all shape_ids used by trips of this route
      const routeTrips = trips.filter(t => t.route_id === routeId);
      const tripIds: string[] = routeTrips.map(t=> t.shape_id);
      const shapes = shapesRaw.filter(s=> tripIds.includes(s.shape_id));
      if (shapes.length === 0) {
        return Promise.reject("No shape points found for this route." );
      }

      // Group shapes by shape_id and sort by sequence
      type ShapePoint = { lat: number; lng: number; sequence: number };
      const shapesMap = new Map<string, ShapePoint[]>();
      for (const row of shapes) {
        const shapeId = row.shape_id;

        if (!shapesMap.has(shapeId)) {
          shapesMap.set(shapeId, []);
        }
        shapesMap.get(shapeId)!.push({
          lat: row.shape_pt_lat,
          lng: row.shape_pt_lon,
          sequence: row.shape_pt_sequence,
        });
      }

      // Convert to array of polylines.
      const shapesPoints: Shape[] = [];
      for (const [_, points] of shapesMap.entries()) {
        points.sort((a, b) => a.sequence - b.sequence);
        shapesPoints.push(points.map(p => [p.lat, p.lng]));
      }

      if (shapesPoints.length === 0) {
        return Promise.reject("No shape points found for this route." );
      }
      return shapesPoints;
}