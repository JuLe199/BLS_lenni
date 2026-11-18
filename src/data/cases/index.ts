import type { SimCase } from "@/lib/cases/types";
import { BLS_CASES } from "@/data/cases/bls";
import { ALS_CASES } from "@/data/cases/als";

export { BLS_CASES, ALS_CASES };
export const ALL_CASES: SimCase[] = [...BLS_CASES, ...ALS_CASES];

export function getAnyCase(id: string): SimCase | undefined {
  return ALL_CASES.find((c) => c.id === id);
}

export function casesOfModule(module: SimCase["module"]): SimCase[] {
  return module === "als" ? ALS_CASES : BLS_CASES;
}
