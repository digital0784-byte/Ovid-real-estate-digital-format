export function simulationsEnabled(env: any = import.meta.env): boolean {
  return !env?.PROD || env?.VITE_ENABLE_SIMULATIONS === "true";
}

export const SIMULATIONS_ENABLED: boolean = simulationsEnabled();

export const SIMULATION_ONLY_TABS: ReadonlySet<string> = new Set([
  "headOfficeSync",
  "launchReadiness",
  "mobileApps",
  "surveying",
]);

export function blockedAsSimulation(
  label?: string,
  enabled: boolean = SIMULATIONS_ENABLED
): boolean {
  if (enabled) return false;
  const prefix = label ? `${label}: ` : "";
  window.alert(
    `${prefix}Not available yet - this action is not connected to a real backend in this build. / ይህ ተግባር ገና ከእውነተኛ ስርዓት ጋር አልተገናኘም።`
  );
  return true;
}
