import { notFound } from "next/navigation";
import { ALS_CASES, getAlsCase } from "@/data/cases/als";
import { toPublicCase } from "@/lib/cases/public";
import CasePlayer from "@/components/CasePlayer";

export function generateStaticParams() {
  return ALS_CASES.map((c) => ({ id: c.id }));
}

export default async function AlsCasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = getAlsCase(id);
  if (!c) notFound();
  const idx = ALS_CASES.findIndex((x) => x.id === c.id);
  const next = ALS_CASES[idx + 1]?.id ?? null;
  return <CasePlayer key={c.id} pc={toPublicCase(c)} nextCaseId={next} />;
}
