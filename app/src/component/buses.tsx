import { icon } from "leaflet";
import type { Bus } from "../interfaces/bus";
import type { Route } from "../interfaces/route";
import type { SelectedRoute } from "../interfaces/selectedRoute";
import { Marker } from "react-leaflet";
import { BusPopup } from "./busPopup";

const busIcon = icon({ iconUrl: "bus.svg", iconSize: [40, 40] });
const selectedBusIcon = icon({ iconUrl: "bus_selected.svg", iconSize: [60, 60] })
export interface BusesProps {
    buses: Bus[],
    selectedRoute : SelectedRoute | null;
    getRoute: (route_id: string) => Route | undefined;
    onBusClick: (bus: Bus) => unknown;

}
export function Buses({ buses, getRoute, onBusClick, selectedRoute }: BusesProps) {
    return (
        buses.map((bus) => {
            const route = bus.trip?.routeId ? getRoute(bus.trip.routeId) : undefined;
            const isSelected = bus.trip?.routeId === selectedRoute?.route_id;
            const icon = isSelected ? selectedBusIcon : busIcon;
            return (
                <Marker
                    key={bus.vehicle.id}
                    position={[bus.position.latitude, bus.position.longitude]}
                    eventHandlers={{ click: () => onBusClick(bus) }}
                    icon={icon}>
                    <BusPopup route={route} />
                </Marker>
            );
        })
    )
}