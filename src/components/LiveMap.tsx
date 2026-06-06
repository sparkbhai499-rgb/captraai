import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons (Leaflet + bundlers)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const bikeIcon = L.divIcon({
  className: "",
  html: `<div style="background:hsl(243 75% 59%);color:white;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,.25);border:3px solid white;font-size:18px;">🛵</div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

const dropIcon = L.divIcon({
  className: "",
  html: `<div style="background:#ef4444;color:white;width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,.25);border:2px solid white;"><span style="transform:rotate(45deg);font-size:14px;">📍</span></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

const Recenter = ({ lat, lng }: { lat: number; lng: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
};

interface Props {
  partner?: { lat: number; lng: number; updatedAt?: string | null } | null;
  destination?: { lat: number; lng: number; label?: string } | null;
  height?: number;
}

export const LiveMap = ({ partner, destination, height = 280 }: Props) => {
  const center = partner
    ? [partner.lat, partner.lng]
    : destination
    ? [destination.lat, destination.lng]
    : [20.5937, 78.9629]; // India fallback

  return (
    <div className="rounded-2xl overflow-hidden border border-border" style={{ height }}>
      <MapContainer
        center={center as [number, number]}
        zoom={partner || destination ? 15 : 5}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {partner && (
          <>
            <Marker position={[partner.lat, partner.lng]} icon={bikeIcon}>
              <Popup>
                Delivery partner
                {partner.updatedAt && (
                  <div className="text-xs text-muted-foreground">
                    {new Date(partner.updatedAt).toLocaleTimeString()}
                  </div>
                )}
              </Popup>
            </Marker>
            <Recenter lat={partner.lat} lng={partner.lng} />
          </>
        )}
        {destination && (
          <Marker position={[destination.lat, destination.lng]} icon={dropIcon}>
            <Popup>{destination.label || "Drop location"}</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
};
