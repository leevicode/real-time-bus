import { Polyline } from "react-leaflet";
import type { Shape } from "../types/shape";

export interface ShapesProps {
    shapes: Shape[];
}
export function Shapes({ shapes }: ShapesProps) {
    return (shapes.length > 0 && shapes
        .map((points, idx) => (
            <Polyline key={idx} positions={points} color="blue" weight={4} opacity={0.7} />
        )))

}