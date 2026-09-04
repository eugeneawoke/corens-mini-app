import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { ProfileContentError } from "../../apps/miniapp/src/components/profile-content-error";

const requireFromMiniApp = createRequire(
  new URL("../../apps/miniapp/package.json", import.meta.url)
);
const { createElement } = requireFromMiniApp("react") as {
  createElement: (...args: unknown[]) => unknown;
};
const { renderToStaticMarkup } = requireFromMiniApp("react-dom/server") as {
  renderToStaticMarkup: (element: unknown) => string;
};

describe("ProfileContentError", () => {
  it("renders no contextual support link for idle or generic editor states", () => {
    const idle = renderToStaticMarkup(createElement(ProfileContentError, {
      state: null,
      field: "about",
      id: "bio-content-error"
    }));
    const generic = renderToStaticMarkup(createElement(ProfileContentError, {
      state: {
        error: {
          field: "about",
          category: null,
          message: "Не удалось сохранить описание. Попробуйте ещё раз."
        }
      },
      field: "about",
      id: "bio-content-error"
    }));

    expect(idle).toBe("");
    expect(generic).toContain("Не удалось сохранить описание. Попробуйте ещё раз.");
    expect(generic).not.toContain("Задать вопрос поддержке");
    expect(generic).not.toContain("https://t.me/");
  });

  it("renders the safe category copy and generic support URL for moderation", () => {
    const markup = renderToStaticMarkup(createElement(ProfileContentError, {
      state: {
        error: {
          field: "about",
          category: "contact",
          message: "Не добавляйте ссылки и контактные данные"
        }
      },
      field: "about",
      id: "bio-content-error"
    }));

    expect(markup).toContain("Не добавляйте ссылки и контактные данные");
    expect(markup).toContain("Задать вопрос поддержке");
    expect(markup).toContain("https://t.me/eugenegusakov?text=%D0%92%D0%BE%D0%BF%D1%80%D0%BE%D1%81%20%D0%BE%20%D0%BF%D1%80%D0%B0%D0%B2%D0%B8%D0%BB%D0%B0%D1%85%20%D0%BF%D1%80%D0%BE%D1%84%D0%B8%D0%BB%D1%8F");
  });

  it("hides the rejected-name error state after that state is dismissed by an edit", () => {
    const rejectedState = {
      error: {
        field: "displayName",
        category: "contact",
        message: "Не добавляйте ссылки и контактные данные"
      }
    } as const;
    const hiddenMarkup = renderToStaticMarkup(createElement(ProfileContentError, {
      state: rejectedState,
      dismissedState: rejectedState,
      field: "displayName",
      id: "display-name-content-error"
    }));
    const nextRejectedState = { error: { ...rejectedState.error } };
    const nextMarkup = renderToStaticMarkup(createElement(ProfileContentError, {
      state: nextRejectedState,
      dismissedState: rejectedState,
      field: "displayName",
      id: "display-name-content-error"
    }));

    expect(hiddenMarkup).toBe("");
    expect(hiddenMarkup).not.toContain("Задать вопрос поддержке");
    expect(nextMarkup).toContain("Не добавляйте ссылки и контактные данные");
    expect(nextMarkup).toContain("Задать вопрос поддержке");
  });
});
