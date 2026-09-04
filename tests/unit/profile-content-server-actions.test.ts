import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { completeOnboardingAction, updateAboutAction } from "../../apps/miniapp/src/app/actions";
import {
  resetNextCache,
  revalidatedPaths,
  revalidatedTags
} from "../helpers/next-cache";
import { setNextSessionToken } from "../helpers/next-headers";
import { RedirectSignal } from "../helpers/next-navigation";

describe("profile content server actions", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.CORENS_API_BASE_URL = "https://api.example.test";
    setNextSessionToken("session-token");
    resetNextCache();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    setNextSessionToken(undefined);
    resetNextCache();
  });

  it("returns a safe moderation result from updateAboutAction", async () => {
    global.fetch = async () => new Response(JSON.stringify({
      statusCode: 400,
      code: "profile_content_rejected",
      category: "contact",
      message: "backend text must not be surfaced"
    }), { status: 400 });

    await expect(updateAboutAction("t.me/secret_handle")).resolves.toEqual({
      error: {
        field: "about",
        category: "contact",
        message: "Не добавляйте ссылки и контактные данные"
      }
    });
    expect(revalidatedPaths).toEqual([]);
  });

  it("revalidates the profile after updateAboutAction succeeds", async () => {
    global.fetch = async () => new Response(null, { status: 204 });

    await expect(updateAboutAction("Спокойный разговор")).resolves.toBeNull();
    expect(revalidatedTags).toEqual(["profile"]);
    expect(revalidatedPaths).toEqual(["/profile"]);
  });

  it("returns a display-name moderation result from completeOnboardingAction", async () => {
    global.fetch = async () => new Response(JSON.stringify({
      statusCode: 400,
      code: "profile_content_rejected",
      category: "abusive",
      message: "backend text must not be surfaced"
    }), { status: 400 });
    const formData = new FormData();
    formData.set("displayName", "ты дурак");
    formData.set("gender", "female");
    formData.set("stateKey", "calm");
    formData.append("trustKeys", "Тихий разговор");
    formData.append("trustKeys", "Тёплая поддержка");

    await expect(completeOnboardingAction(null, formData)).resolves.toEqual({
      error: {
        field: "displayName",
        category: "abusive",
        message: "Уберите грубые или оскорбительные выражения"
      }
    });
  });

  it("revalidates and redirects after completeOnboardingAction succeeds", async () => {
    global.fetch = async () => new Response(null, { status: 204 });
    const formData = new FormData();
    formData.set("displayName", "Анна");
    formData.set("gender", "female");
    formData.set("stateKey", "calm");
    formData.append("trustKeys", "Тихий разговор");
    formData.append("trustKeys", "Тёплая поддержка");

    await expect(completeOnboardingAction(null, formData)).rejects.toEqual(
      new RedirectSignal("/")
    );
    expect(revalidatedTags).toEqual(["profile"]);
    expect(revalidatedPaths).toEqual(["/", "/profile", "/connection"]);
  });
});
