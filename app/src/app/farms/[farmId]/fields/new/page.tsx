"use client";

import { useParams, useRouter } from "next/navigation";
import FieldOnboarding from "@/components/field/FieldOnboarding";
import { useAuth } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { Spinner } from "@/components/ui";
import type { Field } from "@/lib/types";

export default function NewFieldPage() {
  const params = useParams<{ farmId: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();

  if (loading) return <Spinner />;
  if (!user) {
    router.replace("/login");
    return <Spinner />;
  }

  function onCreated(field: Field) {
    router.push(`/fields/${field.id}`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">{t("field.new")}</h1>
      <div className="card">
        <FieldOnboarding farmId={params.farmId} onCreated={onCreated} />
      </div>
    </div>
  );
}
