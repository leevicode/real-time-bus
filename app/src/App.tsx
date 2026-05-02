import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "./App.css";
import { getSocket } from "./service/busSocket";
import { getApiBaseUrl } from "./service/routeService";
import type { Shape } from "./types/shape";
import type { Route } from "./interfaces/route";
import type { Bus } from "./interfaces/bus";
import type { Stop } from "./interfaces/stop";
import type { StopRouteInfo } from "./interfaces/stop_route_info";
import type { Point } from "./types/point";
import { useMapEvents } from 'react-leaflet';
import { Shapes } from "./component/shapes";
import { UserLocation } from "./component/userLocation";
import { Stops } from "./component/stops";
import type { SelectedRoute } from "./interfaces/selectedRoute";
import { Buses } from "./component/buses";



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
  const [selectedRoute, setSelectedRoute] = useState<SelectedRoute | null>(null);
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
    if (selectedRoute == undefined) return;
    fetch(getApiBaseUrl() + `/api/shapes/jyväskylä/${selectedRoute.route_id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load shape");
        return res.json();
      })
      .then((data) => {
        setSelectedRoute({ route_id: selectedRoute.route_id, shape: data.shapes });
      })
      .catch((err) => {
        console.error("Shape fetch error:", err);
      });
  }, [selectedRoute?.route_id]
  );
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


  const handleBusClick = (bus: Bus) => {
    const route = bus.trip?.routeId ? getRoute(bus.trip.routeId) : undefined;
    if (route != undefined) {
      setSelectedRoute({ route_id: route.route_id, shape: [] });
    } else {
      console.warn("No route metadata found for bus", bus);
    }
  };
  const shapes: Shape[] = (selectedRoute && selectedRoute.shape) ?? [];
  if (loading) return <div>Loading routes...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <>
      <div className="app-container">
        <h1 className="app-title">Waltti Routes in Jyväskylä</h1>
        <div className="map-wrapper">
          <div className="map-inner">
            <MapContainer
              center={map_position}
              zoom={13}
              scrollWheelZoom={true}
              style={{ height: '100%', width: '100%' }}
            >
              <CenterOnUser userLocation={userLocation} />
              <MapClickHandler onClick={() => setSelectedRoute(null)} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {<Shapes shapes={shapes} />}
              {<UserLocation userLocation={userLocation} userLocationAccuracy={userLocationAccuracy} />}
              {<Stops
                stops={stops}
                onStopClick={fetchStopRoutes}
                onRouteClick={(route_id: string) => setSelectedRoute({ route_id, shape: [] })}
                stopRoutes={stopRoutes} />
              }
              {<Buses
                buses={buses}
                getRoute={getRoute}
                selectedRoute={selectedRoute}
                onBusClick={handleBusClick} />
              }
            </MapContainer>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;