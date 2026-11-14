export const SIMULATIONS_ENABLED: boolean =
  !import.meta.env.PROD || import.meta.env.VITE_ENABLE_SIMULATIONS === "true";

export const SIMULATION_ONLY_TABS: ReadonlySet<string> = new Set([
  "biometricBoard",
  "fingerprintBoard",
  "biometricKiosk",
  "headOfficeSync",
  "launchReadiness",
]);
