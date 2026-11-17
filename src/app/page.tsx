import { BLS_CASES } from "@/data/cases/bls";
import { toPublicCase } from "@/lib/cases/public";
import Dashboard from "@/components/Dashboard";

export default function Home() {
  return <Dashboard cases={BLS_CASES.map(toPublicCase)} />;
}
