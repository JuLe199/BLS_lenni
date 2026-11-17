/** Working title – change here to rename the app everywhere. */
export const APP_NAME = "eLS";
export const APP_NAME_LONG = "eLS – Life Support Case Trainer";
export const APP_TAGLINE = "Case-based resuscitation training, grounded in the ERC Guidelines 2025";

export interface ModuleInfo {
  id: string;
  short: string;
  name: string;
  status: "live" | "planned";
  href?: string;
  guideline: string;
}

export const MODULES: ModuleInfo[] = [
  { id: "bls", short: "BLS", name: "Adult Basic Life Support", status: "live", href: "/bls", guideline: "ERC Guidelines 2025 – Adult BLS" },
  { id: "als", short: "ALS", name: "Adult Advanced Life Support", status: "planned", guideline: "ERC Guidelines 2025 – Adult ALS" },
  { id: "pls", short: "PLS", name: "Paediatric Life Support", status: "planned", guideline: "ERC Guidelines 2025 – PLS" },
  { id: "spec", short: "SC", name: "Special Circumstances", status: "planned", guideline: "ERC Guidelines 2025 – Special Circumstances" },
];
