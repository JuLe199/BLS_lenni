import { BLS_CASES } from "@/data/cases/bls";
import { toPublicCase } from "@/lib/cases/public";
import CaseLibrary from "@/components/CaseLibrary";

export const metadata = { title: "BLS cases – eLS" };

export default function BlsPage() {
  return <CaseLibrary cases={BLS_CASES.map(toPublicCase)} />;
}
