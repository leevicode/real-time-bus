// src/components/BusPopup.tsx
import { Popup } from "react-leaflet";
import type { BusPopupProps } from "../interfaces/busPopupProps";

export function BusPopup({ route }: BusPopupProps) {
  return (
    <Popup>
      {route ? (
        <div>
          <strong>{route.route_short_name || "?"}</strong>
          {route.route_long_name && <span> – {route.route_long_name}</span>}
        </div>
      ) : (
        <div>Route information not available</div>
      )}
    </Popup>
  );
}