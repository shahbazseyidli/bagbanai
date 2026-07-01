"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { api, ApiError } from "@/lib/api";
import { t } from "@/lib/i18n";
import { DisplayMap } from "@/components/FieldMap";
import { Placeholder, Spinner } from "@/components/ui";
import type { FieldDetail, IndexPoint } from "@/lib/types";

const INDICES = ["NDVI", "EVI", "SAVI", "MSAVI", "NDMI", "NDWI", "NBR", "NBR2", "TVI"];

export default function OverviewTab({ field }: { field: FieldDetail }) {
  const [index, setIndex] = useState("NDVI");
  const [series, setSeries] = useState<IndexPoint[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setUnavailable(false);
    (async () => {
      try {
        const data = await api.get<IndexPoint[] | { points?: IndexPoint[] }>(
          `/api/fields/${field.id}/indices?index=${index}`,
        );
        if (!active) return;
        const points = Array.isArray(data) ? data : (data?.points ?? []);
        setSeries(points);
        if (!points || points.length === 0) setUnavailable(true);
      } catch (err) {
        if (!active) return;
        // Pipeline not built yet → 404/empty handled gracefully.
        if (err instanceof ApiError && (err.status === 404 || err.status === 501)) {
          setUnavailable(true);
        } else {
          setUnavailable(true);
        }
        setSeries([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [field.id, index]);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="card">
          <h3 className="mb-3 font-semibold text-slate-800">{t("idx.title")}</h3>
          <label className="label">{t("idx.select")}</label>
          <select className="input mb-4" value={index} onChange={(e) => setIndex(e.target.value)}>
            {INDICES.map((ix) => (
              <option key={ix} value={ix}>
                {ix}
              </option>
            ))}
          </select>

          {loading ? (
            <Spinner />
          ) : unavailable || !series || series.length === 0 ? (
            <Placeholder>{t("idx.noData")}</Placeholder>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#059669" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="mb-3 font-semibold text-slate-800">{field.name}</h3>
          <DisplayMap polygon={field.geom} />
        </div>
      </div>
    </div>
  );
}
