"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";

type TravelMapPoint = {
  id: string;
  name: string;
  type: "VISITED" | "WANT_TO_GO" | "TRIP";
  lat: number;
  lng: number;
};

type TravelMapProps = {
  points: TravelMapPoint[];
};

const visitedIcon = L.divIcon({
  className: "travel-map-pin",
  html: '<div style="width:12px;height:12px;border-radius:9999px;background:#10b981;border:2px solid #ffffff;box-shadow:0 0 0 2px rgba(16,185,129,0.3)"></div>',
  iconSize: [12, 12],
});

const wishlistIcon = L.divIcon({
  className: "travel-map-pin",
  html: '<div style="width:12px;height:12px;border-radius:9999px;background:#c5a38e;border:2px solid #ffffff;box-shadow:0 0 0 2px rgba(197,163,142,0.3)"></div>',
  iconSize: [12, 12],
});

const tripIcon = L.divIcon({
  className: "travel-map-pin",
  html: '<div style="width:12px;height:12px;border-radius:9999px;background:#3b82f6;border:2px solid #ffffff;box-shadow:0 0 0 2px rgba(59,130,246,0.3)"></div>',
  iconSize: [12, 12],
});

function getIcon(pointType: TravelMapPoint["type"]) {
  if (pointType === "VISITED") return visitedIcon;
  if (pointType === "TRIP") return tripIcon;
  return wishlistIcon;
}

export default function TravelMap({ points }: TravelMapProps) {
  const center: [number, number] = points.length > 0 ? [points[0].lat, points[0].lng] : [20, 10];
  const zoom = points.length > 0 ? 2 : 1;

  return (
    <div className="h-[380px] w-full overflow-hidden rounded-3xl border border-[var(--border)]">
      <MapContainer center={center} zoom={zoom} className="h-full w-full" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.map((point) => (
          <Marker key={point.id} position={[point.lat, point.lng]} icon={getIcon(point.type)}>
            <Popup>
              <div className="text-xs font-medium">
                {point.name}
                <div className="mt-1 text-[10px] text-stone-500">
                  {point.type === "VISITED" ? "Schon besucht" : point.type === "TRIP" ? "Geplante Reise" : "Wunschziel"}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
