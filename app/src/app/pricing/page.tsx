import Link from "next/link";
import { Leaf } from "lucide-react";
import PricingTable from "@/components/PricingTable";

export const metadata = {
  title: "Qiymətlər — Bağban AI",
  description: "Bağban AI paketləri: pulsuz monitorinqdən AI aqronom məsləhətinə qədər.",
};

export default function PricingPage() {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-gradient-to-br from-emerald-600 to-green-700 px-6 py-10 text-center text-white">
        <Leaf className="mx-auto mb-3 h-9 w-9" />
        <h1 className="text-2xl font-bold sm:text-3xl">Sizə uyğun paketi seçin</h1>
        <p className="mx-auto mt-3 max-w-2xl text-emerald-50">
          Pulsuz peyk monitorinqi ilə başlayın, hazır olanda AI aqronom məsləhəti, çiləmə pəncərəsi
          və suvarma balansına keçin. İstənilən vaxt dəyişə bilərsiniz.
        </p>
      </section>

      <PricingTable />

      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-6 text-center">
        <p className="text-sm text-slate-600">
          Sualınız var? Böyük təsərrüfat və ya kooperativ üçün fərdi təklif lazımdır?
        </p>
        <Link
          href="/signup"
          className="mt-3 inline-block rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Pulsuz qeydiyyatdan keçin
        </Link>
      </div>
    </div>
  );
}
