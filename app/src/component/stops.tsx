import type { Stop } from "../interfaces/stop";
import type { StopRouteInfo } from "../interfaces/stop_route_info";
import { StopPopup } from "./stopPopup."

export interface StopsParams {
    stops: Stop[];
    stopRoutes: Record<string, StopRouteInfo[]>;
    onRouteClick: (r: string) => unknown;
    onStopClick: (route_id: string) => unknown
};

export function Stops({ stops, stopRoutes, onRouteClick, onStopClick }: StopsParams) {
    return (
        <>
            {stops.map((stop) => (
                <StopPopup
                    key={stop.id}
                    stop={stop}
                    onStopClick={() => onStopClick(stop.id)}
                    onRouteClick={(route_id) => onRouteClick(route_id)}
                    stopRoutes={stopRoutes}
                />)
            )}
        </>
    )
}
