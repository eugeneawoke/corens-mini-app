import { describe, expect, it } from "vitest";
import {
  getProfileContentActionError,
  getProfileContentSupportHref
} from "../../apps/miniapp/src/lib/profile-content-errors";
import { executeProfileContentMutation } from "../../apps/miniapp/src/lib/profile-content-mutation";

describe("profile content actions", () => {
  it("returns only the approved field-local moderation error", async () => {
    expect(getProfileContentActionError("about", {
      statusCode: 400,
      code: "profile_content_rejected",
      category: "contact",
      message: "untrusted backend text"
    })).toEqual({
      error: {
        field: "about",
        category: "contact",
        message: "Не добавляйте ссылки и контактные данные"
      }
    });
  });

  it("does not expose an arbitrary backend error to the bio editor", async () => {
    expect(getProfileContentActionError("about", {
      message: "database password: do-not-show"
    })).toEqual({
      error: {
        field: "about",
        category: null,
        message: "Не удалось сохранить описание. Попробуйте ещё раз."
      }
    });
  });

  it("maps a moderation response through the profile mutation request path", async () => {
    const fetchCalls: Array<[string, RequestInit]> = [];
    const result = await executeProfileContentMutation({
      field: "about",
      baseUrl: "https://api.example.test/",
      sessionToken: "session-token",
      path: "/api/profile/about",
      init: { method: "PATCH", body: JSON.stringify({ about: "t.me/secret_handle" }) },
      fetchImpl: async (url, init) => {
        fetchCalls.push([url, init]);
        return new Response(JSON.stringify({
          statusCode: 400,
          code: "profile_content_rejected",
          category: "contact",
          message: "untrusted backend text"
        }), { status: 400, headers: { "content-type": "application/json" } });
      }
    });

    expect(result).toEqual({
      error: {
        field: "about",
        category: "contact",
        message: "Не добавляйте ссылки и контактные данные"
      }
    });
    expect(fetchCalls).toEqual([["https://api.example.test/api/profile/about", {
      method: "PATCH",
      body: JSON.stringify({ about: "t.me/secret_handle" }),
      headers: {
        "content-type": "application/json",
        authorization: "Bearer session-token"
      },
      cache: "no-store"
    }]]);
  });

  it("uses a generic support topic that contains neither rejected content nor a matched term", () => {
    const href = getProfileContentSupportHref();

    expect(href).toContain("https://t.me/eugenegusakov");
    expect(href).toContain(encodeURIComponent("Вопрос о правилах профиля"));
    expect(href).not.toContain("secret_handle");
    expect(href).not.toContain("дурак");
  });
});
