import { notFound } from "next/navigation";
import { BLS_CASES, getCase } from "@/data/cases/bls";
import { toPublicCase } from "@/lib/cases/public";
import CasePlayer from "@/components/CasePlayer";

export function generateStaticParams() {
  return BLS_CASES.map((c) => ({ id: c.id }));
}

export default async function BlsCasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = getCase(id);
  if (!c) notFound();
  const idx = BLS_CASES.findIndex((x) => x.id === c.id);
  const next = BLS_CASES[idx + 1]?.id ?? null;
  return <CasePlayer key={c.id} pc={toPublicCase(c)} nextCaseId={next} />;
}
