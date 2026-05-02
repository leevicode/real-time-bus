import { icon } from "leaflet";
import type { Point } from "../types/point";
import { Circle, Marker } from "react-leaflet";

const userLocationIcon = icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

export interface UserLocationProps {
    userLocation: Point | null;
    userLocationAccuracy: number | null;
}

export function UserLocation({ userLocation, userLocationAccuracy }: UserLocationProps) {
    if (userLocation == null) return (<></>);
    return (
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
            <Marker position={userLocation} icon={userLocationIcon}>
                <div>
                    You are here
                    {userLocationAccuracy && ` (accuracy: ±${Math.round(userLocationAccuracy)}m)`}
                </div>
            </Marker>
        </>
    )
}