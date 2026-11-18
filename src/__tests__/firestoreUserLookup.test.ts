import { describe, expect, it, vi } from "vitest";
import {
  decodeFirestoreRestDocument,
  decodeFirestoreRestValue,
  fetchUserProfileWithIdToken,
} from "../server/firestoreUserLookup";

describe("Firestore User Profile REST Lookup (Starter-Tier Safe)", () => {
  it("decodes Firestore REST v1 typed field values cleanly", () => {
    expect(decodeFirestoreRestValue({ stringValue: "Super Admin" })).toBe("Super Admin");
    expect(decodeFirestoreRestValue({ booleanValue: true })).toBe(true);
    expect(decodeFirestoreRestValue({ integerValue: "42" })).toBe(42);
    expect(decodeFirestoreRestValue({ doubleValue: 3.5 })).toBe(3.5);
    expect(decodeFirestoreRestValue({ nullValue: null })).toBeNull();
    expect(
      decodeFirestoreRestDocument({
        name: "projects/p/databases/db/documents/users/u1",
        fields: {
          uid: { stringValue: "u1" },
          role: { stringValue: "HR Manager" },
          status: { stringValue: "Active" },
          assignedProjects: {
            arrayValue: {
              values: [{ stringValue: "Bole Tower" }, { stringValue: "Head Office" }],
            },
          },
          meta: {
            mapValue: {
              fields: {
                mfaRequired: { booleanValue: false },
              },
            },
          },
        },
      })
    ).toEqual({
      uid: "u1",
      role: "HR Manager",
      status: "Active",
      assignedProjects: ["Bole Tower", "Head Office"],
      meta: { mfaRequired: false },
    });
  });

  it("queries the named Firestore database with caller Bearer ID token and returns active profile", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          name: "projects/digital-construction-erp/databases/ai-studio-ovidrealestateal-2aa0489d-a7f9-4ce4-a1a5-8c801423f125/documents/users/uid-123",
          fields: {
            role: { stringValue: "Super Admin" },
            status: { stringValue: "Active" },
            displayName: { stringValue: "Test Admin" },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const res = await fetchUserProfileWithIdToken({
      uid: "uid-123",
      idToken: "firebase-id-token-abc",
      projectId: "digital-construction-erp",
      databaseId: "ai-studio-ovidrealestateal-2aa0489d-a7f9-4ce4-a1a5-8c801423f125",
      appCheckToken: "app-check-xyz",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "https://firestore.googleapis.com/v1/projects/digital-construction-erp/databases/ai-studio-ovidrealestateal-2aa0489d-a7f9-4ce4-a1a5-8c801423f125/documents/users/uid-123"
    );
    expect(init.headers.Authorization).toBe("Bearer firebase-id-token-abc");
    expect(init.headers["X-Firebase-AppCheck"]).toBe("app-check-xyz");
    expect(res).toEqual({
      exists: true,
      data: {
        role: "Super Admin",
        status: "Active",
        displayName: "Test Admin",
      },
    });
  });

  it("returns exists=false on 404 and throws on non-404 error statuses", async () => {
    const notFoundFetch = vi.fn().mockResolvedValue(new Response("", { status: 404 }));
    const notFound = await fetchUserProfileWithIdToken({
      uid: "missing-uid",
      idToken: "tok",
      projectId: "digital-construction-erp",
      fetchImpl: notFoundFetch as unknown as typeof fetch,
    });
    expect(notFound).toEqual({ exists: false, data: null });

    const errorFetch = vi.fn().mockResolvedValue(
      new Response("PERMISSION_DENIED", { status: 403, statusText: "Forbidden" })
    );
    await expect(
      fetchUserProfileWithIdToken({
        uid: "uid-1",
        idToken: "tok",
        projectId: "digital-construction-erp",
        fetchImpl: errorFetch as unknown as typeof fetch,
      })
    ).rejects.toThrow(/403/);
  });
});
