import { Popup, Marker } from "react-leaflet";
import type { StopRouteInfo } from "../interfaces/stop_route_info";
import type { Stop } from "../interfaces/stop";
import { icon } from "leaflet";

interface StopPopupProps {
  stop: Stop;
  onStopClick: () => unknown;
  onRouteClick: (route_id : string) => unknown;
  stopRoutes: Record<string, StopRouteInfo[]>;
}
const stopIcon = icon({iconSize: [20,20], iconUrl: "station.svg"});
export function StopPopup({ stop, onStopClick, onRouteClick, stopRoutes }: StopPopupProps) {
  return (
    <Marker
      key={stop.id}
      position={[stop.lat, stop.lon]}
      icon={stopIcon}
      eventHandlers={{ click: onStopClick }}>
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
                      <a onClick={() => onRouteClick(route.route_id)}>
                        <u>{route.route_short_name || route.route_long_name}</u>
                      </a>
                      <span style={{ marginLeft: "8px", color: "#555", fontSize: "0.9em" }} >
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
    </Marker>
  )
}