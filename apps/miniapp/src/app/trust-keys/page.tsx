import { redirect } from "next/navigation";
import { AppSurface, Button, KeyChip, NoticeCard, Panel, Section, TopBar } from "@corens/ui";

import { updateTrustKeysAction } from "../actions";
import { AuthBootstrapScreen } from "../../components/auth-bootstrap";
import { getProfileSummary, MiniAppSessionRequiredError } from "../../lib/api";

export default async function TrustKeysPage() {
  let snapshot;

  try {
    snapshot = await getProfileSummary();
  } catch (error) {
    if (error instanceof MiniAppSessionRequiredError) {
      return <AuthBootstrapScreen />;
    }

    throw error;
  }

  if (!snapshot.onboardingCompleted) {
    redirect("/onboarding");
  }

  return (
    <AppSurface>
      <TopBar title="Ключи доверия" backHref="/profile" />

      <form action={updateTrustKeysAction} className="corens-stack corens-gap-sm">
        <Panel tone="accent">
          <div className="corens-stack corens-gap-xs">
            <span className="corens-eyebrow">Ограничение MVP</span>
            <h2 className="corens-section-title">{snapshot.trustKeys.limitLabel}</h2>
            <p className="corens-copy corens-copy-muted">
              Подбор ищет пересечение хотя бы по одному ключу. Изменение ограничено cooldown.
            </p>
          </div>
        </Panel>

        {snapshot.trustKeys.groups.map((group) => (
          <Section key={group.title} title={group.title}>
            <Panel>
              <div className="corens-chip-row">
                {group.items.map((item) => (
                  <label key={item} className="corens-chip-checkbox">
                    <input
                      type="checkbox"
                      name="trustKeys"
                      value={item}
                      defaultChecked={snapshot.trustKeys.selected.includes(item)}
                    />
                    <KeyChip active={snapshot.trustKeys.selected.includes(item)}>
                      {item}
                    </KeyChip>
                  </label>
                ))}
              </div>
            </Panel>
          </Section>
        ))}

        <NoticeCard
          title="Cooldown"
          description={snapshot.trustKeys.cooldownLabel}
          tone="warning"
        />

        <Button type="submit">Сохранить выбор</Button>
      </form>
    </AppSurface>
  );
}
