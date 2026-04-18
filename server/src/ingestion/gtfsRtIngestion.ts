import fetch from 'node-fetch';
import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import { RawBusEntity, RawBusPosition } from '../types';

export async function fetchBusPositions(apiKey: string): Promise<RawBusEntity[]> {
  const url = 'https://data.waltti.fi/jyvaskyla/api/gtfsrealtime/v1.0/feed/vehicleposition';
  const response = await fetch(url, {
    headers: { Authorization: `Basic ${apiKey}` },
  });

  if (!response.ok) {
    throw new Error(`GTFS-RT fetch failed: ${response.status} ${response.statusText}`);
  }

  const buffer = await response.arrayBuffer();
  const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));
  return feed.entity.map((entity) => ({
    id: entity.id!,
    bus: entity.vehicle as RawBusPosition,
  }));
}