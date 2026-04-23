import { useState, useEffect, } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, CircleMarker } from "react-leaflet";
import { getSocket } from "./service/busSocket";
import { getApiBaseUrl } from "./service/routeService";
import type { Shape } from "./types/shape";
import type { Route } from "./interfaces/route";
import type { Bus } from "./interfaces/bus";
import type { Stop } from "./interfaces/stop";
import type { StopRouteInfo } from "./interfaces/stop_route_info";
import { BusPopup } from "./component/busPopup";
import type { Point } from "./types/point";

import { useMapEvents } from 'react-leaflet';

function MapClickHandler({ onClick }: { onClick: () => void }) {
  useMapEvents({
    click: () => onClick(),
  });
  return null;
}

function App() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [selectedRouteShapes, setSelectedRouteShapes] = useState<Shape[] | null >(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [stopRoutes, setStopRoutes] = useState<Record<string, StopRouteInfo[]>>({});

  const fetchStopRoutes = async (stopId: string) => {
    // Already fetched.
    if (stopRoutes[stopId]) return;
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/stop-routes/jyväskylä/${stopId}`);
      if (!res.ok) throw new Error();
      const routes = await res.json() as StopRouteInfo[];
      setStopRoutes((prev: Record<string, StopRouteInfo[]>) => ({ ...prev, [stopId]: routes }));
    } catch {
      console.error("Failed to fetch routes for stop", stopId);
    }
  };

  useEffect(() => {
    fetch(getApiBaseUrl() + "/api/routes/jyväskylä")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch routes");
        return res.json();
      })
      .then((data) => {
        setRoutes(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetch(getApiBaseUrl() + "/api/stops/jyväskylä")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch stops");
        return res.json();
      })
      .then((data) => {
        setStops(data);
      })
      .catch((err) => {
        console.error("Stops fetch error:", err);
      });
  }, []);

  useEffect(() => {
    getSocket()
      .then((socket) => {
        console.log("resolved");
        socket.onopen = () => console.log('Connected');
        socket.onmessage = (event) => {
          setBuses(JSON.parse(event.data));
        };
        socket.onclose = () => console.log('Disconnected');
      })
      .catch((error) => {
        setError(error.message);
      });
  }, []);

  const getRoute = (routeId: string) => routes.find((r) => r.route_id == routeId);

  const map_position: Point = [62.24147, 25.72088];

  // Fetch shape points when a bus is clicked
  const fetchRouteShape = async (routeId: string) => {
    try {
      const res = await fetch(getApiBaseUrl() + `/api/shapes/jyväskylä/${routeId}`);
      if (!res.ok) throw new Error("Failed to load shape");
      const data = await res.json();
      setSelectedRouteShapes(data.shapes?.length ? data.shapes : null);
    } catch (err) {
      console.error("Shape fetch error:", err);
      setSelectedRouteShapes(null);
    }
  };

  const handleBusClick = (bus: Bus) => {
    const route = bus.trip?.routeId ? getRoute(bus.trip.routeId) : undefined;
    if (route) {
      fetchRouteShape(route.route_id);
    } else {
      console.warn("No route metadata found for bus", bus);
    }
  };

  if (loading) return <div>Loading routes...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Waltti Routes in Jyväskylä</h1>
      <MapContainer center={map_position} zoom={13} scrollWheelZoom={false}>
        <MapClickHandler onClick={() => setSelectedRouteShapes(null)} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {selectedRouteShapes && selectedRouteShapes.map((points, idx) => (
  <Polyline key={idx} positions={points} color="blue" weight={4} opacity={0.7} />
        ))}
        {
          <div style={{ position: "absolute", bottom: 10, left: 10, background: "white", padding: "4px 8px", borderRadius: 4, zIndex: 1000 }}>
            Loading route...
          </div>
        }

        {stops.map((stop) => (
          <CircleMarker
            key={stop.id}
            center={[stop.lat, stop.lon]}
            radius={6}
            fillColor="green"
            color="darkgreen"
            weight={2}
            opacity={0.8}
            fillOpacity={0.7}
            eventHandlers={{
              click: () => fetchStopRoutes(stop.id)
            }}
          >
          <Popup>
          <div>
            <strong>{stop.name}</strong>
              {stopRoutes[stop.id] && (() => {
                // Filter routes with next_arrival_minutes < 60 (less than 1 hour)
                const upcomingRoutes = stopRoutes[stop.id]
                  .filter((route: StopRouteInfo) => route.next_arrival_minutes !== null && route.next_arrival_minutes < 60)
                  .sort((a: StopRouteInfo, b: StopRouteInfo) => (a.next_arrival_minutes as number) - (b.next_arrival_minutes as number));

                if (upcomingRoutes.length === 0) {
                  return <div style={{ marginTop: "8px" }}>No buses arriving within the next hour</div>;
                }

                return (
                  <div style={{ marginTop: "8px" }}>
                    <strong>Routes & next bus:</strong>
                    <ul style={{ margin: "4px 0 0 0", paddingLeft: "16px" }}>
                      {upcomingRoutes.map((route: StopRouteInfo) => (
                        <li key={route.route_id}>
                          {route.route_short_name || route.route_long_name}
                          <span style={{ marginLeft: "8px", color: "#555", fontSize: "0.9em" }}>
                            → {route.next_arrival_minutes} min
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}
              {!stopRoutes[stop.id] && <div>Click to load routes…</div>}
            </div>
          </Popup>
        </CircleMarker>
        ))}

        {buses.map((bus) => {
          const route = bus.trip?.routeId ? getRoute(bus.trip.routeId) : undefined;
          return (
            <Marker
              key={bus.vehicle.id}
              position={[bus.position.latitude, bus.position.longitude]}
              eventHandlers={{ click: () => handleBusClick(bus) }}
            >
              <BusPopup route={route} />
            </Marker>
          );
        })}
      </MapContainer>
      <p> end</p>
    </div>
  );
}

export default App;
