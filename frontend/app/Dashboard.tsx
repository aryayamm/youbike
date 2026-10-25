"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

type Bucket = {
  samples: number; bikes: number; yb1: number; yb2: number; eyb: number; docks: number;
};
type Row = Bucket & { station_id: string; name: string; dow: number; hour: number };

type TypeKey = "all" | "yellow" | "orange";
type Metric = "bikes" | "docks";

// ASSUMPTION: which type is which colour. Swap the keys here if it's wrong.
const BIKE_TYPES: Record<TypeKey, { label: string; keys: ("yb1" | "yb2" | "eyb")[] }> = {
  all: { label: "All", keys: ["yb1", "yb2", "eyb"] },
  yellow: { label: "Yellow", keys: ["yb2"] },
  orange: { label: "Orange", keys: ["eyb"] },
};
const TYPE_OPTIONS = (Object.keys(BIKE_TYPES) as TypeKey[]).map((k) => ({
  value: k, label: BIKE_TYPES[k].label,
}));
const BAR_COLORS: Record<TypeKey, string> = {
  all: "#4c1d95", yellow: "#6d28d9", orange: "#8b5cf6",
};
const DOCK_COLOR = "#7c3aed";

const MIN_SAMPLES = 3; // hide hours with too little data
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DOW_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Postgres: 0 = Sunday

const emptyBucket = (): Bucket => ({ samples: 0, bikes: 0, yb1: 0, yb2: 0, eyb: 0, docks: 0 });

function addTo(b: Bucket, r: Bucket) {
  b.samples += r.samples; b.bikes += r.bikes; b.yb1 += r.yb1;
  b.yb2 += r.yb2; b.eyb += r.eyb; b.docks += r.docks;
}

function average(b: Bucket | undefined, metric: Metric, type: TypeKey): number | null {
  if (!b || b.samples < MIN_SAMPLES) return null;
  const total =
    metric === "docks"
      ? b.docks
      : BIKE_TYPES[type].keys.reduce((sum, k) => sum + b[k], 0);
  return Math.round((total / b.samples) * 10) / 10;
}

// One hue per metric, lightness does the work: colour-blind safe and not harsh.
function cellColor(v: number, max: number, metric: Metric) {
  const t = max > 0 ? v / max : 0;
  const hue = metric === "bikes" ? 262 : 270;
  return `hsl(${hue} 55% ${94 - t * 56}%)`;
}

function Segmented<T extends string>({
  value, options, onChange, disabled, label,
}: {
  value: T; options: { value: T; label: string }[];
  onChange: (v: T) => void; disabled?: boolean; label: string;
}) {
  return (
    <div className={`seg ${disabled ? "disabled" : ""}`} role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value} type="button" disabled={disabled}
          className={value === o.value ? "on" : ""}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
function StationPicker({
  stations, selected, onChange, disabled,
}: {
  stations: { id: string; name: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const label =
    selected.length === stations.length
      ? "All stations"
      : selected.length === 1
        ? stations.find((s) => s.id === selected[0])?.name ?? "1 station"
        : `${selected.length} of ${stations.length} stations`;

  function toggle(id: string) {
    if (selected.includes(id)) {
      if (selected.length === 1) return; // keep at least one ticked
      onChange(selected.filter((x) => x !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  return (
    <div className="picker" ref={ref}>
      <button
        type="button" className="dash-select picker-btn" disabled={disabled}
        aria-expanded={open} onClick={() => setOpen(!open)}
      >
        {label} <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="picker-pop" role="group" aria-label="Stations">
          <button
            type="button" className="picker-all"
            onClick={() => onChange(stations.map((s) => s.id))}
          >
            Select all
          </button>
          {stations.map((s) => (
            <label key={s.id} className="picker-row">
              <input
                type="checkbox" checked={selected.includes(s.id)}
                onChange={() => toggle(s.id)}
              />
              {s.name}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
function ChartCard({
  title, subtitle, data, color, loading,
}: {
  title: string; subtitle: string;
  data: { hour: number; value: number | null }[];
  color: string; loading: boolean;
}) {
  const hasData = data.some((d) => d.value !== null);
  return (
    <div className="dash-card">
      <h3>{title}</h3>
      <p className="dash-sub">{subtitle}</p>
      {loading ? (
        <div className="skeleton" style={{ height: 220 }} />
      ) : !hasData ? (
        <p className="dash-empty">Not enough data yet.</p>
      ) : (
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#ebe5f7" />``
              <XAxis dataKey="hour" tickLine={false} axisLine={false}
                     interval="preserveStartEnd" tick={{ fontSize: 12 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(v) => [String(v), "Average"]}
                labelFormatter={(h) => `${h}:00`}
              />
              <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default function Dashboard({ api }: { api: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");
  const [station, setStation] = useState("all");
  const [chartType, setChartType] = useState<TypeKey>("all");
  const [metric, setMetric] = useState<Metric>("bikes");
  const [heatType, setHeatType] = useState<TypeKey>("all");
  const [picked, setPicked] = useState<string | null>(null);
  const [heatSel, setHeatSel] = useState<string[] | null>(null); // null = all stations

  function load() {
    setState("loading");
    fetch(`${api}/analytics/summary`)
      .then((res) => {
        if (!res.ok) throw new Error("bad response");
        return res.json();
      })
      .then((data) => { setRows(data); setState("ready"); })
      .catch(() => setState("error"));
  }

  useEffect(() => { load(); }, []);

  const loading = state === "loading";

  const stations = useMemo(() => {
    const m = new Map<string, string>();
    rows.forEach((r) => m.set(r.station_id, r.name));
    return Array.from(m, ([id, name]) => ({ id, name }));
  }, [rows]);

  const scoped = useMemo(
    () => (station === "all" ? rows : rows.filter((r) => r.station_id === station)),
    [rows, station]
  );

  const hourBuckets = useMemo(() => {
    const b = Array.from({ length: 24 }, emptyBucket);
    scoped.forEach((r) => addTo(b[r.hour], r));
    return b;
  }, [scoped]);

  const heatScoped = useMemo(
    () => (heatSel === null ? rows : rows.filter((r) => heatSel.includes(r.station_id))),
    [rows, heatSel]
  );
  const heatIds = heatSel ?? stations.map((s) => s.id);

  const weekBuckets = useMemo(() => {
    const m = new Map<string, Bucket>();
    heatScoped.forEach((r) => {
      const k = `${r.dow}-${r.hour}`;
      if (!m.has(k)) m.set(k, emptyBucket());
      addTo(m.get(k)!, r);
    });
    return m;
  }, [heatScoped]);

  const bikeData = hourBuckets.map((b, h) => ({ hour: h, value: average(b, "bikes", chartType) }));
  const dockData = hourBuckets.map((b, h) => ({ hour: h, value: average(b, "docks", "all") }));

  const heat = DOW_ORDER.map((d) =>
    Array.from({ length: 24 }, (_, h) => average(weekBuckets.get(`${d}-${h}`), metric, heatType))
  );
  const heatMax = Math.max(0, ...heat.flat().filter((v): v is number => v !== null));
  const gradient =
    metric === "bikes"
      ? `linear-gradient(90deg, ${cellColor(0, 1, "bikes")}, ${cellColor(1, 1, "bikes")})`
      : `linear-gradient(90deg, ${cellColor(0, 1, "docks")}, ${cellColor(1, 1, "docks")})`;

  let readout = "Tap or hover a cell to see its value.";
  if (picked) {
    const [i, h] = picked.split("-").map(Number);
    const v = heat[i][h];
    const samples = weekBuckets.get(`${DOW_ORDER[i]}-${h}`)?.samples ?? 0;
    readout =
      v === null
        ? `${DAYS[i]} ${h}:00: not enough data yet (needs at least ${MIN_SAMPLES} readings).`
        : `${DAYS[i]} ${h}:00: about ${v} ${metric === "bikes" ? "bikes" : "empty docks"} on average (${samples} readings).`;
  }

  const scopeLabel =
    station === "all" ? "Average per station" : stations.find((s) => s.id === station)?.name ?? "";

  return (
    <section className="dash">
      <h2>Hourly availability</h2>

      <div className="dash-toolbar">
        <select
          className="dash-select" value={station}
          onChange={(e) => setStation(e.target.value)}
          disabled={loading} aria-label="Station"
        >
          <option value="all">All stations</option>
          {stations.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <Segmented
          label="Bike type for hourly chart" value={chartType}
          options={TYPE_OPTIONS} onChange={setChartType} disabled={loading}
        />
      </div>

      {state === "error" && (
        <div className="dash-error" role="alert">
          Couldn&apos;t load analytics.
          <button onClick={load}>Retry</button>
        </div>
      )}

      {state !== "error" && (
        <div className="dash-grid">
          <ChartCard
            title="Available bikes" loading={loading}
            subtitle={`${scopeLabel} · by hour, Taipei time`}
            data={bikeData} color={BAR_COLORS[chartType]}
          />
          <ChartCard
            title="Empty docks" loading={loading}
            subtitle={`${scopeLabel} · by hour, Taipei time`}
            data={dockData} color={DOCK_COLOR}
          />
        </div>
      )}

      <h2>Weekly heatmap</h2>

      <div className="dash-card">
        <div className="dash-toolbar">
          <Segmented
            label="Metric" value={metric} disabled={loading}
            options={[
              { value: "bikes" as Metric, label: "Available bikes" },
              { value: "docks" as Metric, label: "Empty docks" },
            ]}
            onChange={setMetric}
          />
          <Segmented
            label="Bike type for heatmap" value={heatType}
            options={TYPE_OPTIONS} onChange={setHeatType}
            disabled={loading || metric === "docks"}
          />
        <StationPicker
            stations={stations}
            selected={heatIds}
            disabled={loading}
            onChange={(ids) => setHeatSel(ids.length === stations.length ? null : ids)}
          />
          {metric === "docks" && (
            <span className="dash-sub" style={{ margin: 0 }}>
              Bike type applies to bikes only.
            </span>
          )}
        </div>

        {loading ? (
          <div className="skeleton" style={{ height: 240 }} />
        ) : state === "error" ? (
          <p className="dash-empty">Couldn&apos;t load data.</p>
        ) : (
          <>
            <div className="hm-scroll">
              <div className="hm-grid" role="grid" aria-label="Weekly heatmap">
                <div />
                {Array.from({ length: 24 }, (_, h) => (
                  <div key={h} className="hm-hour">{h % 3 === 0 ? h : ""}</div>
                ))}
                {heat.map((vals, i) => (
                  <div key={DAYS[i]} style={{ display: "contents" }}>
                    <div className="hm-label">{DAYS[i]}</div>
                    {vals.map((v, h) => {
                      const key = `${i}-${h}`;
                      return (
                        <button
                          key={key} type="button"
                          className={`hm-cell ${v === null ? "empty" : ""} ${picked === key ? "picked" : ""}`}
                          style={v === null ? undefined : { background: cellColor(v, heatMax, metric) }}
                          aria-label={
                            v === null
                              ? `${DAYS[i]} ${h}:00, no data`
                              : `${DAYS[i]} ${h}:00, ${v} ${metric === "bikes" ? "bikes" : "empty docks"}`
                          }
                          onClick={() => setPicked(key)}
                          onMouseEnter={() => setPicked(key)}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <p className="hm-readout" aria-live="polite">{readout}</p>

            <div className="hm-legend">
              <span>0</span>
              <div className="hm-legend-bar" style={{ background: gradient }} />
              <span>{heatMax || "–"}</span>
              <span style={{ marginLeft: 8 }}>Grey = not enough data</span>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
