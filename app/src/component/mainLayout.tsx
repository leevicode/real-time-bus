import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { Point } from "../types/point";
import { useEffect, useRef, type ReactNode } from "react";

interface MainLayoutProps {
    userLocation: Point | null;
    map_position: Point;
    onMapClick : () => unknown;
    children: ReactNode;

}

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


export const MainLayout = (props: MainLayoutProps) =>  <>
      <div className="app-container">
        <h1 className="app-title">Waltti Routes in Jyväskylä</h1>
        <div className="map-wrapper">
          <div className="map-inner">
            <MapContainer
              center={props.map_position}
              zoom={13}
              scrollWheelZoom={true}
              style={{ height: '100%', width: '100%' }}
            >
              <CenterOnUser userLocation={props.userLocation} />
              <MapClickHandler onClick={props.onMapClick} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
                {props.children}
            </MapContainer>
          </div>
        </div>
      </div>
    </>