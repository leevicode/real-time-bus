export interface Bus {
  vehicle: {
    id: string;
  };
  position: {
    latitude: number;
    longitude: number;
  };
  trip?: {
    routeId: string;
  };
}