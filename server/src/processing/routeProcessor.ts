import { Route } from '@common/route';

export function processRoute(raw: Route): Route {
  if (!raw.route_id) throw new Error('Route missing route_id');
  return raw;
}