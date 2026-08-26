import { createElement } from "../../apps/miniapp/node_modules/react";
import { renderToStaticMarkup } from "../../apps/miniapp/node_modules/react-dom/server";
import { describe, expect, it } from "vitest";
import { ConversationStarterCard } from "../../apps/miniapp/src/components/conversation-starter-card";

describe("ConversationStarterCard", () => {
  it("renders the suggestion as optional selectable text beside a copy action", () => {
    const markup = renderToStaticMarkup(
      createElement(ConversationStarterCard, {
        text: "Привет. Хочешь немного поговорить?"
      })
    );

    expect(markup).toContain("Не знаешь, с чего начать?");
    expect(markup).toContain("Можно написать так:");
    expect(markup).toContain("Привет. Хочешь немного поговорить?");
    expect(markup).toContain("Скопировать");
    expect(markup).toContain("corens-starter-text");
  });
});
