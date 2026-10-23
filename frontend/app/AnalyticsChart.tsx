"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export type Row = {
  station_id: string;
  name: string;
  hour: number;
  avg_bikes: number;
  samples: number;
};

export default function AnalyticsChart({ rows }: { rows: Row[] }) {
  const names = Array.from(new Set(rows.map((r) => r.name)));

  return (
    <section style={{ marginTop: 32 }}>
      <h2>Average bikes by hour (Taipei time)</h2>
      {names.map((name) => {
        const data = rows.filter((r) => r.name === name && r.samples >= 3);
        return (
          <div className="card" key={name}>
            <h3>{name}</h3>
            <div style={{ width: "100%", height: 200 }}>
              <ResponsiveContainer>
                <BarChart data={data}>
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="avg_bikes" fill="#6b21a8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })}
    </section>
  );
}