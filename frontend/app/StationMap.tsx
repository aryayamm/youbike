"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, useMapEvents } from "react-leaflet";
import { Plus, X, Loader2 } from "lucide-react";

type MapStation = {
  station_id: string;
  name_en: string | null;
  name_tw: string | null;
  lat: number;
  lng: number;
  bikes: number | null;
  docks: number | null;
  status: number | null;
  monitored: boolean;
};

type LoadState = "loading" | "ready" | "error" | "zoom";

const CENTER: [number, number] = [24.7968, 120.9967]; // NTHU
const MIN_ZOOM_TO_FETCH = 14;

function BoundsLoader({
  api, onData, onState,
}: {
  api: string;
  onData: (d: MapStation[]) => void;
  onState: (s: LoadState) => void;
}) {
  const map = useMap();
  const abort = useRef<AbortController | null>(null);

  function load() {
    if (map.getZoom() < MIN_ZOOM_TO_FETCH) {
      abort.current?.abort();
      onData([]);
      onState("zoom");
      return;
    }
    const b = map.getBounds();
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    onState("loading");

    const qs = new URLSearchParams({
      min_lat: String(b.getSouth()),
      max_lat: String(b.getNorth()),
      min_lng: String(b.getWest()),
      max_lng: String(b.getEast()),
    });

    fetch(`${api}/map/stations?${qs}`, { signal: ctrl.signal })
      .then((res) => {
        if (!res.ok) throw new Error("bad response");
        return res.json();
      })
      .then((data) => {
        onData(data);
        onState("ready");
      })
      .catch((e) => {
        if (e.name !== "AbortError") onState("error");
      });
  }

  useMapEvents({ moveend: load });
  useEffect(() => {
    load();
    return () => abort.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export default function StationMap({
  api, monitored, busy, onAdd, onRemove,
}: {
  api: string;
  monitored: string[];
  busy: string[];
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const [stations, setStations] = useState<MapStation[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  const statusText =
    state === "loading" ? "Loading stations..." :
    state === "error" ? "Couldn't load stations. Move the map to retry." :
    state === "zoom" ? "Zoom in to see stations." :
    `${stations.length} stations in view`;

  return (
    <div>
      <div className="map-wrap">
        <MapContainer center={CENTER} zoom={16} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
<TileLayer
  attribution="Tiles &copy; Esri"
  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
/>
          <BoundsLoader api={api} onData={setStations} onState={setState} />

          {stations.map((s) => {
            const isMonitored = monitored.includes(s.station_id);
            const suspended = s.status === 2;
            const isBusy = busy.includes(s.station_id);

            const style = suspended
              ? { color: "#8a849b", fillColor: "#c9c4d6" }
              : isMonitored
                ? { color: "#4c1d95", fillColor: "#4c1d95" }
                : { color: "#4c1d95", fillColor: "#ffffff" };

            return (
              <CircleMarker
                key={s.station_id}
                center={[s.lat, s.lng]}
                radius={8}
                pathOptions={{ ...style, weight: 2, fillOpacity: 1 }}
              >
                <Popup>
                  <div className="map-pop">
                    <strong>{s.name_en || s.name_tw}</strong>
                    {s.name_en && s.name_tw && <div className="map-pop-sub">{s.name_tw}</div>}
                    <div className="map-pop-line">
                      {suspended ? "Suspended" : `${s.bikes ?? "-"} bikes · ${s.docks ?? "-"} empty docks`}
                    </div>
                    {isMonitored ? (
                      <button className="text-btn" disabled={isBusy} onClick={() => onRemove(s.station_id)}>
                        {isBusy ? <Loader2 size={14} strokeWidth={1.5} className="spin" /> : <X size={14} strokeWidth={1.5} />}
                        {isBusy ? "Removing" : "Remove"}
                      </button>
                    ) : (
                      <button className="text-btn" disabled={isBusy} onClick={() => onAdd(s.station_id)}>
                        {isBusy ? <Loader2 size={14} strokeWidth={1.5} className="spin" /> : <Plus size={14} strokeWidth={1.5} />}
                        {isBusy ? "Adding" : "Add"}
                      </button>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      <div className="map-legend">
        <span><i className="dot-on" /> Monitored</span>
        <span><i className="dot-off" /> Not monitored</span>
        <span><i className="dot-sus" /> Suspended</span>
        <span className="map-status">{statusText}</span>
      </div>
    </div>
  );
}