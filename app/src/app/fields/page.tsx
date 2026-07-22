"use client";

// D2.1 — Sahələr: a flat, large-row list of all the user's fields (bottom-nav destination).
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, MapPin, Plus } from "lucide-react";
import { api, azError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ErrorNote } from "@/components/ui";
import { ListSkeleton } from "@/components/Skeleton";
import type { Farm, Field, Org } from "@/lib/types";

export default function FieldsListPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [fields, setFields] = useState<Field[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
      return;
    }
    if (!user) return;
    (async () => {
      try {
        const orgs = await api.get<Org[]>("/api/orgs");
        if (orgs.length === 0) {
          router.replace("/onboarding");
          return;
        }
        const farms = await api.get<Farm[]>(`/api/farms?org_id=${orgs[0].id}`);
        const lists = await Promise.all(
          farms.map((f) => api.get<Field[]>(`/api/fields?farm_id=${f.id}`).catch(() => [])),
        );
        setFields(lists.flat());
      } catch (err) {
        setError(azError(err));
        setFields([]);
      }
    })();
  }, [loading, user, router]);

  if (loading || fields === null) return <ListSkeleton count={4} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Sahələr</h1>
        <Link href="/onboarding" className="btn-primary">
          <Plus className="h-4 w-4" /> Sahə əlavə et
        </Link>
      </div>
      <ErrorNote message={error} />

      {fields.length === 0 ? (
        <div className="card text-center">
          <MapPin className="mx-auto h-8 w-8 text-emerald-600" />
          <p className="mt-2 text-slate-700">Hələ sahəniz yoxdur.</p>
          <Link href="/onboarding" className="btn-primary mt-3 inline-flex">
            <Plus className="h-4 w-4" /> İlk sahənizi əlavə edin
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {fields.map((f) => (
            <li key={f.id}>
              <Link
                href={`/fields/${f.id}`}
                className="flex min-h-14 items-center justify-between gap-3 rounded-xl border-[1.5px] border-slate-300 bg-white px-4 py-3 hover:border-emerald-300"
              >
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-slate-900">{f.name}</p>
                  <p className="text-sm text-slate-600">
                    {f.area_ha != null ? `${f.area_ha.toFixed(2)} ha` : "—"}
                  </p>
                </div>
                <ChevronLeft className="h-5 w-5 shrink-0 rotate-180 text-slate-400" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
