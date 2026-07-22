"use client";

// D2.1 + D2.5 — Bildirişlər center: every alert is an event card with a severity chip + a single
// action that deep-links to the exact field. Marks everything read on open.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, AlertTriangle, OctagonAlert, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ListSkeleton } from "@/components/Skeleton";

interface Notif {
  id: string;
  field_id: string | null;
  type: string;
  severity: string;
  title: string;
  body: string;
  created_at: string;
  read: boolean;
}

const SEV: Record<string, { cls: string; Icon: typeof Check }> = {
  critical: { cls: "bg-bad-tint text-bad", Icon: OctagonAlert },
  warning: { cls: "bg-warn-tint text-warn", Icon: AlertTriangle },
  info: { cls: "bg-good-tint text-good", Icon: Check },
};

function timeAgo(iso: string): string {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "indicə";
  if (s < 3600) return `${Math.floor(s / 60)} dəq əvvəl`;
  if (s < 86400) return `${Math.floor(s / 3600)} saat əvvəl`;
  return new Date(iso).toISOString().slice(0, 10);
}

export default function NotificationsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [items, setItems] = useState<Notif[] | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
      return;
    }
    if (!user) return;
    (async () => {
      try {
        const r = await api.get<{ notifications: Notif[] }>("/api/notifications");
        setItems(r?.notifications ?? []);
        await api.post("/api/notifications/read", {}).catch(() => undefined);
      } catch {
        setItems([]);
      }
    })();
  }, [loading, user, router]);

  if (loading || items === null) return <ListSkeleton count={4} />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Bildirişlər</h1>

      {items.length === 0 ? (
        <div className="card text-center text-slate-600">
          <Check className="mx-auto h-8 w-8 text-emerald-600" />
          <p className="mt-2">Hələ bildiriş yoxdur. Risk və hava xəbərdarlıqları burada görünəcək.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => {
            const sev = SEV[n.severity] ?? SEV.info;
            const Icon = sev.Icon;
            const card = (
              <div className="flex items-start gap-3 rounded-xl border-[1.5px] border-slate-300 bg-white px-4 py-3">
                <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${sev.cls}`}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900">{n.title}</p>
                  <p className="mt-0.5 text-sm text-slate-600">{n.body}</p>
                  <p className="mt-1 text-xs text-slate-500">{timeAgo(n.created_at)}</p>
                </div>
                {n.field_id && <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />}
              </div>
            );
            return n.field_id ? (
              <li key={n.id}>
                <Link href={`/fields/${n.field_id}`}>{card}</Link>
              </li>
            ) : (
              <li key={n.id}>{card}</li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
