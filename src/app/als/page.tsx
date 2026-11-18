import { ALS_CASES } from "@/data/cases/als";
import { toPublicCase } from "@/lib/cases/public";
import CaseLibrary from "@/components/CaseLibrary";

export const metadata = { title: "ALS cases – eLS" };

export default function AlsPage() {
  return <CaseLibrary cases={ALS_CASES.map(toPublicCase)} module="als" />;
}
