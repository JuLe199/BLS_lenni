import type { SimCase } from "@/lib/cases/types";

/** What the browser receives: no scenario script, no hidden findings, no ending rules. */
export type PublicCase = Omit<SimCase, "script" | "ending" | "facts">;

export function toPublicCase(c: SimCase): PublicCase {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { script, ending, facts, ...rest } = c;
  return rest;
}
