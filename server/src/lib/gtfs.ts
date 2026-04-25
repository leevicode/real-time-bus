import { cacheParam } from '../cache/cache';
import { fetchGftsData, Zip, RawShape, RawTrip } from '../ingestion/staticGtfsIngestion';
import { processShapes } from '../processing/shapeProcessor';

export const cityToAuthorityId: Record<string, string> = {
  jyväskylä: '209',
  lahti: '223',
  oulu: '229',
};

export const fetchData = cacheParam(fetchGftsData);
  const _shapeProcessor =
  /* C */ cacheParam(async (routeId: string) =>
  /* A */ cacheParam(async (tripsRaw: RawTrip[]) =>
  /* C */ cacheParam(async (shapesRaw: RawShape[]) =>
  /* H */ processShapes(routeId, tripsRaw, shapesRaw)
  /* E */ )));

export const shapeProcessor = async (a: string, b: RawTrip[], c: RawShape[]) => (await (await _shapeProcessor(a))(b))(c)

