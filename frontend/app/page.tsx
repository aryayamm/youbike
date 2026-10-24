"use client";

import { useEffect, useState } from "react";
import Dashboard from "./Dashboard";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

type Station = {
  station_id: string;
  name: string;
  bikes: number | null;
  empty_docks: number | null;
  yb1_bikes: number | null;
  yb2_bikes: number | null;
  eyb_bikes: number | null;
  collected_at: string | null;
  status: number | null;
};

type Result = {
  station_id: string;
  name_tw: string;
  name_en: string;
};

function timeAgo(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    timeZone: "Asia/Taipei",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StationCard({ s, onRemove }: { s: Station; onRemove: () => void }) {
  const suspended = s.status === 2;
  const waiting = s.collected_at === null;
  const bikes = s.bikes ?? 0;
  const docks = s.empty_docks ?? 0;
  const total = bikes + docks;
  const pct = total > 0 ? Math.round((bikes / total) * 100) : 0;

  let badge = { label: "Available", cls: "ok" };
  if (waiting) badge = { label: "Waiting", cls: "idle" };
  else if (suspended) badge = { label: "Suspended", cls: "bad" };
  else if (bikes === 0) badge = { label: "No bikes", cls: "warn" };

  return (
    <div className="st-card">
      <div className="st-top">
        <div className="st-name">{s.name}</div>
        <span className={`badge ${badge.cls}`}>{badge.label}</span>
      </div>

      {waiting ? (
        <div className="st-waiting">Waiting for the first reading...</div>
      ) : suspended ? (
        <div className="st-suspended">Station suspended</div>
      ) : (
        <>
          <div className="st-nums">
            <div>
              <div className="st-num bikes">{s.bikes ?? "-"}</div>
              <div className="st-label">bikes</div>
            </div>
            <div>
              <div className="st-num docks">{s.empty_docks ?? "-"}</div>
              <div className="st-label">empty docks</div>
            </div>
          </div>
          <div className="bar" aria-hidden="true">
            <span style={{ width: `${pct}%` }} />
          </div>
          <div className="chips">
            <span className="chip">YB 1.0: {s.yb1_bikes ?? 0}</span>
            <span className="chip">YB 2.0: {s.yb2_bikes ?? 0}</span>
            <span className="chip">YB 2.0E: {s.eyb_bikes ?? 0}</span>
          </div>
        </>
      )}

      <div className="st-foot">
        <span>{s.collected_at ? `Updated ${timeAgo(s.collected_at)}` : ""}</span>
        <button className="link-danger" onClick={onRemove}>Remove</button>
      </div>
    </div>
  );
}

export default function Home() {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [searched, setSearched] = useState(false);

  function loadStations() {
    setLoading(true);
    fetch(`${API}/stations`)
      .then((res) => res.json())
      .then((data) => setStations(data))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadStations();
  }, []);

  function search() {
    fetch(`${API}/search?q=${encodeURIComponent(query)}`)
      .then((res) => res.json())
      .then((data) => {
        setResults(data);
        setSearched(true);
      });
  }

  function addStation(id: string) {
    fetch(`${API}/stations/${id}`, { method: "POST" }).then(() => {
      setResults([]);
      setSearched(false);
      setQuery("");
      loadStations();
    });
  }

  function removeStation(id: string) {
    fetch(`${API}/stations/${id}`, { method: "DELETE" }).then(loadStations);
  }

  return (
    <div className="shell">
      <header className="hero">
        <div>
          <span className="pill"><span className="dot" /> Live from YouBike</span>
          <h1>NTHU YouBike Ride</h1>
          <p>Check bikes and docks near campus before you walk over.</p>
        </div>
        <button className="btn" onClick={loadStations} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </header>

      <h2 className="section-title" style={{ marginTop: 0 }}>Your stations</h2>
      {loading && stations.length === 0 ? (
        <div className="stations">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 200 }} />
          ))}
        </div>
      ) : stations.length === 0 ? (
        <p className="hint">No stations yet. Search below to add one.</p>
      ) : (
        <div className="stations">
          {stations.map((s) => (
            <StationCard key={s.station_id} s={s} onRemove={() => removeStation(s.station_id)} />
          ))}
        </div>
      )}

      <h2 className="section-title">Add a station</h2>
      <div className="panel">
        <div className="search-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Search by name, e.g. NTHU"
          />
          <button className="btn small" onClick={search}>Search</button>
        </div>
        {results.map((r) => (
          <div className="result" key={r.station_id}>
            <span>{r.name_en} / {r.name_tw}</span>
            <button className="btn small" onClick={() => addStation(r.station_id)}>Add</button>
          </div>
        ))}
        {searched && results.length === 0 && <p className="hint">No stations found.</p>}
      </div>

      <Dashboard api={API} />
    </div>
  );
}