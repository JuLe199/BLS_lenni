import { notFound } from "next/navigation";
import { KNOWLEDGE } from "@/data/knowledge";
import KnowledgeSection from "@/components/KnowledgeSection";

export function generateStaticParams() {
  return [{ module: "bls" }, { module: "als" }];
}

export async function generateMetadata({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  return { title: `${module.toUpperCase()} knowledge – eLS` };
}

export default async function LearnPage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  if (module !== "bls" && module !== "als") notFound();
  return <KnowledgeSection key={module} module={KNOWLEDGE[module]} />;
}
