import { ALL_CASES } from "@/data/cases";
import { toPublicCase } from "@/lib/cases/public";
import Dashboard from "@/components/Dashboard";

export default function Home() {
  return <Dashboard cases={ALL_CASES.map(toPublicCase)} />;
}
