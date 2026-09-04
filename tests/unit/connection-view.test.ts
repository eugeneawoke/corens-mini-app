import { readFileSync } from "node:fs";
import type { ConsentStatusView } from "@corens/domain";
import { describe, expect, it } from "vitest";
import { getConnectionCardState } from "../../apps/miniapp/src/lib/connection-view";

const connectionListSource = readFileSync(
  new URL("../../apps/miniapp/src/app/connection/page.tsx", import.meta.url),
  "utf8"
);

const connectionDetailSource = readFileSync(
  new URL("../../apps/miniapp/src/app/connection/[id]/page.tsx", import.meta.url),
  "utf8"
);

const globalsSource = readFileSync(
  new URL("../../apps/miniapp/src/app/globals.css", import.meta.url),
  "utf8"
);

function contactConsent(
  overrides: Partial<ConsentStatusView> = {}
): ConsentStatusView {
  return {
    channel: "contact",
    status: "pending",
    myDecision: "pending",
    peerRequested: false,
    warnings: [],
    ...overrides
  };
}

function cardState(contact: ConsentStatusView) {
  return getConnectionCardState({ contactConsent: contact });
}

describe("getConnectionCardState", () => {
  it("gives approved contact access priority over incoming-request fields", () => {
    expect(
      cardState(
        contactConsent({
          status: "approved",
          myDecision: "pending",
          peerRequested: true
        })
      )
    ).toBe("ready");
  });

  it("keeps approved contact access ready when the handoff artifact is available", () => {
    expect(
      cardState(
        contactConsent({
          status: "approved",
          myDecision: "approved",
          peerRequested: true,
          artifactType: "telegram_deep_link",
          artifactValue: "https://t.me/example"
        })
      )
    ).toBe("ready");
  });

  it("marks only a pending unanswered peer request as incoming", () => {
    expect(
      cardState(
        contactConsent({
          status: "pending",
          myDecision: "pending",
          peerRequested: true
        })
      )
    ).toBe("incoming");
  });

  it.each([
    ["the peer has not requested contact", contactConsent({ peerRequested: false })],
    [
      "the current participant already approved",
      contactConsent({ myDecision: "approved", peerRequested: true })
    ],
    [
      "the consent is declined",
      contactConsent({ status: "declined", peerRequested: true })
    ]
  ])("keeps the card neutral when %s", (_case, consent) => {
    expect(cardState(consent)).toBe("default");
  });
});

describe("connection card structure", () => {
  it("renders compact semantic state icons with hidden accessible labels", () => {
    expect(connectionListSource).toContain("getConnectionCardState(connection)");
    expect(connectionListSource).toContain("corens-connection-card-${cardState}");
    expect(connectionListSource).toContain("<LockOpen");
    expect(connectionListSource).toContain("<Reply");
    expect(connectionListSource).toContain('className="corens-visually-hidden"');
    expect(connectionListSource).toContain("Контакт открыт — можно написать");
    expect(connectionListSource).toContain("Нужно ответить на запрос контакта");
    expect(connectionListSource).not.toContain("Ждёт вашего ответа");
  });

  it("styles ready and incoming states without changing card content spacing", () => {
    expect(globalsSource).toContain(".corens-connection-card-ready");
    expect(globalsSource).toContain(".corens-connection-card-incoming");
    expect(globalsSource).toContain(".corens-connection-card-status-icon");
    expect(globalsSource).toMatch(
      /\.corens-connection-card-status-icon\s*\{[^}]*position:\s*absolute/s
    );
    expect(globalsSource).toMatch(
      /\.corens-bento-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/s
    );
    expect(globalsSource).toMatch(
      /\.corens-connection-card-inner\s*\{[^}]*padding:\s*18px 16px 20px/s
    );
  });
});

describe("peer bio placement", () => {
  it("keeps the bio off compact list cards", () => {
    expect(connectionListSource).not.toContain("connection.about");
  });

  it("shows a trimmed bio on detail only when it is non-empty", () => {
    expect(connectionDetailSource).toContain("const peerAbout = connection.about?.trim();");
    expect(connectionDetailSource).toContain('<Section title="О себе">');
    expect(connectionDetailSource).toContain("{peerAbout}");
    expect(connectionDetailSource).toMatch(
      /\{peerAbout \? \([\s\S]*?<Section title="О себе">[\s\S]*?\) : null\}/
    );
  });
});
