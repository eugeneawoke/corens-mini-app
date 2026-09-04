import { readFileSync } from "node:fs";
import type { ConsentStatusView } from "@corens/domain";
import { createElement } from "../../apps/miniapp/node_modules/react";
import { renderToStaticMarkup } from "../../apps/miniapp/node_modules/react-dom/server";
import { describe, expect, it } from "vitest";
import { ConnectionCardStatusIcon } from "../../apps/miniapp/src/components/connection-card-status-icon";
import { PeerBioSection } from "../../apps/miniapp/src/components/peer-bio-section";
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
    expect(connectionListSource).toContain("<ConnectionCardStatusIcon state={cardState} />");
    expect(connectionListSource).not.toContain("Ждёт вашего ответа");
  });

  it("reserves icon space and wraps narrow-card content without changing base padding", () => {
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
      /\.corens-connection-card-inner\s*\{[^}]*padding:\s*18px 16px 20px[^}]*min-width:\s*0/s
    );
    expect(globalsSource).toMatch(
      /\.corens-connection-card-name\s*\{[^}]*min-width:\s*0[^}]*overflow-wrap:\s*anywhere/s
    );
    expect(globalsSource).toMatch(
      /\.corens-connection-card-ready \.corens-connection-card-name,[\s\S]*?\.corens-connection-card-incoming \.corens-connection-card-name\s*\{[^}]*padding-inline-end:\s*28px/s
    );
  });

  it("keeps semantic state cues alongside a high-contrast focus ring", () => {
    expect(globalsSource).toMatch(
      /\.corens-connection-card-status-icon\[data-state="incoming"\]\s*\{[^}]*color:\s*#9d6a1d/s
    );
    expect(globalsSource).toMatch(
      /\.corens-connection-card-ready:focus-visible,[\s\S]*?\.corens-connection-card-incoming:focus-visible,[\s\S]*?\.corens-connection-card-default:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--corens-accent\)[^}]*outline-offset:\s*3px/s
    );
    expect(globalsSource).toMatch(
      /\.corens-connection-card-ready:focus-visible\s*\{[^}]*rgba\(61, 155, 88/s
    );
    expect(globalsSource).toMatch(
      /\.corens-connection-card-incoming:focus-visible\s*\{[^}]*rgba\(196, 129, 26/s
    );
  });
});

describe("ConnectionCardStatusIcon", () => {
  it("renders an open-lock cue with its hidden ready label attached", () => {
    const markup = renderToStaticMarkup(
      createElement(ConnectionCardStatusIcon, { state: "ready" })
    );

    expect(markup).toContain('data-state="ready"');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toMatch(
      /class="corens-connection-card-status-icon"[\s\S]*class="corens-visually-hidden">Контакт открыт — можно написать<\/span><\/span>/
    );
  });

  it("renders a response cue with its hidden incoming label attached", () => {
    const markup = renderToStaticMarkup(
      createElement(ConnectionCardStatusIcon, { state: "incoming" })
    );

    expect(markup).toContain('data-state="incoming"');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toMatch(
      /class="corens-connection-card-status-icon"[\s\S]*class="corens-visually-hidden">Нужно ответить на запрос контакта<\/span><\/span>/
    );
  });

  it("renders no status cue for the neutral state", () => {
    expect(
      renderToStaticMarkup(
        createElement(ConnectionCardStatusIcon, { state: "default" })
      )
    ).toBe("");
  });
});

describe("peer bio placement", () => {
  it("keeps the bio off compact list cards", () => {
    expect(connectionListSource).not.toContain("connection.about");
  });

  it("delegates conditional detail rendering to the peer bio component", () => {
    expect(connectionDetailSource).toContain("<PeerBioSection about={connection.about} />");
  });

  it.each([null, "", "   "])("omits an empty peer bio section for %j", (about) => {
    expect(
      renderToStaticMarkup(createElement(PeerBioSection, { about }))
    ).toBe("");
  });

  it("renders a filled peer bio as trimmed detail content", () => {
    const markup = renderToStaticMarkup(
      createElement(PeerBioSection, { about: "  Люблю долгие прогулки  " })
    );

    expect(markup).toContain("О себе");
    expect(markup).toContain("Люблю долгие прогулки");
    expect(markup).not.toContain("  Люблю долгие прогулки  ");
    expect(markup).toContain('class="corens-copy corens-copy-muted"');
  });
});
