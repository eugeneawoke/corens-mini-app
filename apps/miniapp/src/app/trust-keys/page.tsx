import { AppSurface, ButtonLink, KeyChip, NoticeCard, Panel, Section, TopBar } from "@corens/ui";

import { getProfileSummary } from "../../lib/api";

export default async function TrustKeysPage() {
  const snapshot = await getProfileSummary();

  return (
    <AppSurface bottomBar={<ButtonLink href="/profile">Сохранить выбор</ButtonLink>}>
      <TopBar title="Ключи доверия" backHref="/profile" />

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
                <KeyChip key={item} active={snapshot.trustKeys.selected.includes(item)}>
                  {item}
                </KeyChip>
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
    </AppSurface>
  );
}
