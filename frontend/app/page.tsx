"use client";

import { useEffect, useState } from "react";
import AnalyticsChart, { type Row } from "./AnalyticsChart";
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

type Station = {
  station_id: string;
  name: string;
  bikes: number | null;
  empty_docks: number | null;
  collected_at: string | null;
}

type Result = {
  station_id: string;
  name_tw: string;
  name_en: string;
};

export default function Home() {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [analytics, setAnalytics] = useState<Row[]>([]);

  function loadStations() {
    setLoading(true);
    fetch(`${API}/stations`)
      .then((res) => res.json())
      .then((data) => setStations(data))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadStations();
    fetch(`${API}/analytics`)
      .then((res) => res.json())
      .then((data) => setAnalytics(data));
  }, []);

  function search() {
    fetch(`${API}/search?q=${encodeURIComponent(query)}`)
      .then((res) => res.json())
      .then((data) => setResults(data));
  }

  function addStation(id: string) {
    fetch(`${API}/stations/${id}`, { method: "POST" }).then(() => {
      setResults([]);
      setQuery("");
      loadStations();
    });
  }

  function removeStation(id: string) {
    fetch(`${API}/stations/${id}`, { method: "DELETE" }).then(loadStations);
  }

  return (
    <main className="page">
      <h1>NTHU YouBike Ride</h1>

      <button className="btn" onClick={loadStations} disabled={loading}>
        {loading ? "Loading..." : "Refresh"}
      </button>

      <div className="search-row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search station name"
        />
        <button className="btn" onClick={search}>Search</button>
      </div>

      {results.map((r) => (
        <div className="result" key={r.station_id}>
          <span>{r.name_en} / {r.name_tw}</span>
          <button className="btn" onClick={() => addStation(r.station_id)}>Add</button>
        </div>
      ))}

      {stations.map((s) => (
        <div className="card" key={s.station_id}>
          <h2>{s.name}</h2>
          <p>
            Bikes: {s.bikes ?? "-"} | Empty docks: {s.empty_docks ?? "-"}
          </p>
          <small>
            {s.collected_at
              ? `Updated: ${new Date(s.collected_at).toLocaleString("en-GB", { timeZone: "Asia/Taipei" })}`
              : "Waiting for first data..."}
          </small>
          <div className="card-footer">
            <button className="btn danger" onClick={() => removeStation(s.station_id)}>
              Remove
            </button>
          </div>
        </div>
      ))}
      <AnalyticsChart rows={analytics} />
    </main>
  );
}