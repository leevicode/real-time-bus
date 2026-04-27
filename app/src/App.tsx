import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Circle, useMap } from "react-leaflet";
import { icon } from "leaflet";

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
import { StopPopup } from "./component/stopPopup.";

const userLocationIcon = icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function MapClickHandler({ onClick }: { onClick: () => void }) {
  useMapEvents({
    click: () => onClick(),
  });
  return null;
}

function CenterOnUser({ userLocation }: { userLocation: Point | null }) {
  const map = useMap();
  const centered = useRef(false); // only center once

  useEffect(() => {
    if (userLocation && !centered.current) {
      map.flyTo(userLocation, 15, { duration: 1.5 });
      centered.current = true;
    }
  }, [userLocation, map]);

  return null;
}

function App() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [selectedRouteShapes, setSelectedRouteShapes] = useState<Shape[] | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [stopRoutes, setStopRoutes] = useState<Record<string, StopRouteInfo[]>>({});

  // User location.
  const [userLocation, setUserLocation] = useState<Point | null>(null);
  const [userLocationAccuracy, setUserLocationAccuracy] = useState<number | null>(null);

  const locationErrorLogged = useRef(false);

  const fetchStopRoutes = async (stopId: string) => {
    // Already fetched.
    if (stopRoutes[stopId]) return;
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/stops/stop-routes/jyväskylä/${stopId}`);
      if (!res.ok) throw new Error();
      const routes = await res.json() as StopRouteInfo[];
      setStopRoutes((prev: Record<string, StopRouteInfo[]>) => ({ ...prev, [stopId]: routes }));
    } catch {
      console.error("Failed to fetch routes for stop", stopId);
    }
  };

  // Fetch routes.
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

  // Fetch stops.
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

  // Websocket for busses.
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

  // User location tracking.
  useEffect(() => {
    if (!navigator.geolocation) {
      console.log("Geolocation is not supported by your browser");
      return;
    }

    const updateLocation = () => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setUserLocation([pos.coords.latitude, pos.coords.longitude]);
            setUserLocationAccuracy(pos.coords.accuracy);
          },
          (err) => {
            if (!locationErrorLogged.current) {
              console.log("Location not available (likely on desktop), err:", err.message);
              locationErrorLogged.current = true;
            }
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      };

      updateLocation();
      const intervalId = setInterval(updateLocation, 1000);
      return () => clearInterval(intervalId);

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
        <CenterOnUser userLocation={userLocation} />
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

        {userLocation && (
          <>
            {userLocationAccuracy && (
              <Circle
                center={userLocation}
                radius={userLocationAccuracy}
                pathOptions={{
                  color: '#4285f4',
                  fillColor: '#4285f4',
                  fillOpacity: 0.1,
                  weight: 1,
                  opacity: 0.5
                }}
              />
            )}
            <Marker
              position={userLocation}
              icon={userLocationIcon}
            >
              <div>
                You are here
                {userLocationAccuracy && ` (accuracy: ±${Math.round(userLocationAccuracy)}m)`}
              </div>
            </Marker>
          </>
        )}

        {stops.map((stop) => (
          <StopPopup
            key={stop.id}
            stop={stop}
            onStopClick={() => fetchStopRoutes(stop.id)}
            onRouteClick={fetchRouteShape}
            stopRoutes={stopRoutes}
          />)
        )}

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
      </div>
  );
}

export default App;
