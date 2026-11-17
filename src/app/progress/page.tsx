import { BLS_CASES } from "@/data/cases/bls";
import { toPublicCase } from "@/lib/cases/public";
import LearningProgress from "@/components/LearningProgress";

export const metadata = { title: "Learning progress – eLS" };

export default function ProgressPage() {
  return <LearningProgress cases={BLS_CASES.map(toPublicCase)} />;
}
