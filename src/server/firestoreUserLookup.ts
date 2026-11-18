export interface FirestoreRestFetchParams {
  uid: string;
  idToken: string;
  projectId: string;
  databaseId?: string;
  appCheckToken?: string;
  fetchImpl?: typeof fetch;
}

export interface FirestoreUserLookupResult {
  exists: boolean;
  data: Record<string, any> | null;
}

/**
 * Decodes a single Firestore REST API v1 typed field value into plain JS types.
 */
export function decodeFirestoreRestValue(val: any): any {
  if (!val || typeof val !== "object") return undefined;
  if ("nullValue" in val) return null;
  if ("stringValue" in val) return String(val.stringValue);
  if ("booleanValue" in val) return Boolean(val.booleanValue);
  if ("integerValue" in val) {
    const n = Number(val.integerValue);
    return Number.isSafeInteger(n) ? n : String(val.integerValue);
  }
  if ("doubleValue" in val) return Number(val.doubleValue);
  if ("timestampValue" in val) return String(val.timestampValue);
  if ("bytesValue" in val) return String(val.bytesValue);
  if ("referenceValue" in val) return String(val.referenceValue);
  if ("geoPointValue" in val) {
    return {
      latitude: Number(val.geoPointValue?.latitude ?? 0),
      longitude: Number(val.geoPointValue?.longitude ?? 0),
    };
  }
  if ("arrayValue" in val) {
    const values = Array.isArray(val.arrayValue?.values) ? val.arrayValue.values : [];
    return values.map((item: any) => decodeFirestoreRestValue(item));
  }
  if ("mapValue" in val) {
    const fields = val.mapValue?.fields;
    return fields && typeof fields === "object" ? decodeFirestoreRestFields(fields) : {};
  }
  return undefined;
}

export function decodeFirestoreRestFields(fields: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [key, rawVal] of Object.entries(fields || {})) {
    const decoded = decodeFirestoreRestValue(rawVal);
    if (decoded !== undefined) {
      out[key] = decoded;
    }
  }
  return out;
}

export function decodeFirestoreRestDocument(docJson: any): Record<string, any> | null {
  if (!docJson || typeof docJson !== "object") return null;
  if (!docJson.fields || typeof docJson.fields !== "object") {
    return {};
  }
  return decodeFirestoreRestFields(docJson.fields);
}

/**
 * Fetches `users/{uid}` via Firestore REST API using the caller's verified Firebase Auth ID token.
 * Because `firestore.rules` permits `allow get: if isOwner(userId)` (`request.auth.uid == uid`),
 * this requires zero GCP IAM permissions on the server service account and works identically on
 * both Google-hosted Starter Tier projects and user-owned Firebase projects.
 */
export async function fetchUserProfileWithIdToken(
  params: FirestoreRestFetchParams
): Promise<FirestoreUserLookupResult> {
  const uid = String(params.uid || "").trim();
  const idToken = String(params.idToken || "").trim();
  const projectId = String(params.projectId || "").trim();
  const databaseId = String(params.databaseId || "(default)").trim() || "(default)";
  const doFetch = params.fetchImpl || fetch;

  if (!uid || !idToken || !projectId) {
    throw new Error("uid, idToken, and projectId are required for Firestore user lookup.");
  }

  const url =
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}` +
    `/databases/${encodeURIComponent(databaseId)}/documents/users/${encodeURIComponent(uid)}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${idToken}`,
  };
  if (params.appCheckToken) {
    headers["X-Firebase-AppCheck"] = params.appCheckToken;
  }

  const resp = await doFetch(url, { method: "GET", headers });

  if (resp.status === 404) {
    return { exists: false, data: null };
  }

  if (!resp.ok) {
    const errBody = await resp.text().catch(() => "");
    throw new Error(`Firestore REST user lookup failed (${resp.status}): ${errBody || resp.statusText}`);
  }

  const docJson = await resp.json();
  return {
    exists: true,
    data: decodeFirestoreRestDocument(docJson),
  };
}
