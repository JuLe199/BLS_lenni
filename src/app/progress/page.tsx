import { ALL_CASES } from "@/data/cases";
import { toPublicCase } from "@/lib/cases/public";
import LearningProgress from "@/components/LearningProgress";

export const metadata = { title: "Learning progress – eLS" };

export default function ProgressPage() {
  return <LearningProgress cases={ALL_CASES.map(toPublicCase)} />;
}
