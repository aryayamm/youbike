"use client";

import { useEffect, useState } from "react";
import { Search, RefreshCw, Plus, X, Loader2 } from "lucide-react";
import Dashboard from "./Dashboard";
import dynamic from "next/dynamic";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

const StationMap = dynamic(() => import("./StationMap"), {
  ssr: false,
  loading: () => <div className="skeleton map-skeleton" />,
});

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

function clock(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    timeZone: "Asia/Taipei",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StationRow({
  s, busy, onRemove,
}: { s: Station; busy: boolean; onRemove: () => void }) {
  const waiting = s.collected_at === null;
  const suspended = s.status === 2;
  const bikes = s.bikes ?? 0;
  const docks = s.empty_docks ?? 0;
  const total = bikes + docks;
  const pct = total > 0 ? Math.round((bikes / total) * 100) : 0;

  let tag: string | null = null;
  if (waiting) tag = "Waiting for first reading";
  else if (suspended) tag = "Suspended";
  else if (bikes === 0) tag = "No bikes";

  return (
    <li className={`row ${busy ? "busy" : ""}`} aria-busy={busy}>
      <div className="row-top">
        <div>
          <div className="row-name">{s.name}</div>
          {busy ? <span className="tag">Removing...</span> : tag && <span className="tag">{tag}</span>}
        </div>
        <button
          className="row-remove"
          onClick={onRemove}
          disabled={busy}
          aria-label={`Remove ${s.name}`}
          title="Remove station"
        >
          {busy ? (
            <Loader2 size={16} strokeWidth={1.5} className="spin" />
          ) : (
            <X size={16} strokeWidth={1.5} />
          )}
        </button>
      </div>

      {!waiting && !suspended && (
        <>
          <div className="row-stats">
            <div>
              <b>{s.bikes ?? "-"}</b>
              <span>bikes</span>
            </div>
            <div>
              <b>{s.empty_docks ?? "-"}</b>
              <span>empty docks</span>
            </div>
          </div>
          <div className="bar" aria-hidden="true">
            <i style={{ width: `${pct}%` }} />
          </div>
          <div className="row-foot">
            <span>
              YB 1.0: {s.yb1_bikes ?? 0} · YB 2.0: {s.yb2_bikes ?? 0} · YB 2.0E: {s.eyb_bikes ?? 0}
            </span>
          </div>
        </>
      )}

      {s.collected_at && (
        <div className="row-foot">
          <span>Updated {clock(s.collected_at)}</span>
        </div>
      )}
    </li>
  );
}

export default function Home() {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  function loadStations() {
    setLoading(true);
    return fetch(`${API}/stations`)
      .then((res) => res.json())
      .then((data) => setStations(data))
      .catch(() => setNotice("Couldn't load stations. Try refreshing."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadStations();
  }, []);

  function search() {
    if (query.trim().length < 2) return;
    setNotice(null);
    setSearching(true);
    fetch(`${API}/search?q=${encodeURIComponent(query)}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        setResults(data);
        setSearched(true);
      })
      .catch(() => setNotice("Search failed. Try again."))
      .finally(() => setSearching(false));
  }

  function clearSearch() {
    setQuery("");
    setResults([]);
    setSearched(false);
  }

  function addStation(id: string) {
    if (busy.includes(id)) return;
    setNotice(null);
    setBusy((b) => [...b, id]);
    fetch(`${API}/stations/${id}`, { method: "POST" })
      .then((res) => {
        if (!res.ok) throw new Error();
        clearSearch();
        return loadStations();
      })
      .catch(() => setNotice("Couldn't add the station. Try again."))
      .finally(() => setBusy((b) => b.filter((x) => x !== id)));
  }

  function removeStation(id: string) {
    if (busy.includes(id)) return;
    setNotice(null);
    setBusy((b) => [...b, id]);
    fetch(`${API}/stations/${id}`, { method: "DELETE" })
      .then((res) => {
        if (!res.ok) throw new Error();
        return loadStations();
      })
      .catch(() => setNotice("Couldn't remove the station. Try again."))
      .finally(() => setBusy((b) => b.filter((x) => x !== id)));
  }

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <span className="brand">NTHU YouBike Ride</span>

          <div className="searchbox">
            <Search size={18} strokeWidth={1.5} className="searchbox-icon" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") search();
                if (e.key === "Escape") clearSearch();
              }}
              placeholder="Search stations by name"
              aria-label="Search stations by name"
            />
            {searching ? (
              <span className="searchbox-clear" aria-hidden="true">
                <Loader2 size={16} strokeWidth={1.5} className="spin" />
              </span>
            ) : (
              query && (
                <button className="searchbox-clear" onClick={clearSearch} aria-label="Clear search">
                  <X size={16} strokeWidth={1.5} />
                </button>
              )
            )}

            {(searching || searched) && (
              <div className="results">
                {searching ? (
                  <div className="result-empty">Searching...</div>
                ) : results.length === 0 ? (
                  <div className="result-empty">No stations match.</div>
                ) : (
                  results.map((r) => {
                    const adding = busy.includes(r.station_id);
                    return (
                      <div className="result" key={r.station_id}>
                        <div>
                          <div className="result-name">{r.name_en}</div>
                          <div className="result-sub">{r.name_tw}</div>
                        </div>
                        <button
                          className="text-btn"
                          onClick={() => addStation(r.station_id)}
                          disabled={adding}
                        >
                          {adding ? (
                            <>
                              <Loader2 size={14} strokeWidth={1.5} className="spin" /> Adding
                            </>
                          ) : (
                            <>
                              <Plus size={14} strokeWidth={1.5} /> Add
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <button
            className="icon-btn"
            onClick={loadStations}
            disabled={loading}
            aria-label="Refresh stations"
            title="Refresh stations"
          >
            <RefreshCw size={18} strokeWidth={1.5} className={loading ? "spin" : ""} />
          </button>
        </div>
      </header>

      <div className="layout">
        <aside className="side" aria-label="Monitored stations">
          <div className="side-head">
            <h2>Monitored stations</h2>
            <span className="side-count">{stations.length}</span>
          </div>

          {notice && (
            <div className="notice" role="alert">
              <span>{notice}</span>
              <button onClick={() => setNotice(null)} aria-label="Dismiss message">
                <X size={14} strokeWidth={1.5} />
              </button>
            </div>
          )}

          {loading && stations.length === 0 ? (
            <>
              <div className="skeleton side-skeleton" />
              <div className="skeleton side-skeleton" />
              <div className="skeleton side-skeleton" />
            </>
          ) : stations.length === 0 ? (
            <p className="empty-note">No stations monitored. Use the search bar to add one.</p>
          ) : (
            <ul className="list">
              {stations.map((s) => (
                <StationRow
                  key={s.station_id}
                  s={s}
                  busy={busy.includes(s.station_id)}
                  onRemove={() => removeStation(s.station_id)}
                />
              ))}
            </ul>
          )}
        </aside>

        <main className="main">
          <h2 className="map-title">Station map</h2>
          <StationMap
            api={API}
            monitored={stations.map((s) => s.station_id)}
            busy={busy}
            onAdd={addStation}
            onRemove={removeStation}
          />
          {!(loading && stations.length === 0) && (
            <Dashboard key={stations.map((s) => s.station_id).join(",")} api={API} />
          )}
        </main>
      </div>
    </>
  );
}