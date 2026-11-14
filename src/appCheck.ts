import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  ReCaptchaEnterpriseProvider,
  getToken,
  AppCheck,
} from "firebase/app-check";
import { app } from "./firebase";

let appCheckInstance: AppCheck | null = null;

export function initAppCheck(): AppCheck | null {
  if (appCheckInstance) return appCheckInstance;
  if (typeof window === "undefined" || !app) return null;

  const siteKey = (import.meta.env.VITE_RECAPTCHA_SITE_KEY || "").trim();
  if (!siteKey) return null;

  const providerType = (import.meta.env.VITE_APPCHECK_PROVIDER || "v3").toLowerCase();
  const provider =
    providerType === "enterprise"
      ? new ReCaptchaEnterpriseProvider(siteKey)
      : new ReCaptchaV3Provider(siteKey);

  try {
    appCheckInstance = initializeAppCheck(app, {
      provider,
      isTokenAutoRefreshEnabled: true,
    });
  } catch (err) {
    console.warn("Firebase App Check initialization notice:", err);
  }
  return appCheckInstance;
}

if (typeof window !== "undefined") {
  initAppCheck();
}

export async function getAppCheckToken(forceRefresh = false): Promise<string | null> {
  const instance = initAppCheck();
  if (!instance) return null;
  try {
    const result = await getToken(instance, forceRefresh);
    return result?.token || null;
  } catch {
    return null;
  }
}
