import { BadgeInfo, HeartHandshake, KeyRound, Lock, Trash2 } from "lucide-react";
import { AppSurface, ListRow, Panel, Section, StatusBadge, TopBar } from "@corens/ui";

import { getProfileSummary } from "../../lib/api";

export default async function ProfilePage() {
  const snapshot = await getProfileSummary();

  return (
    <AppSurface>
      <TopBar title="Профиль" backHref="/" />

      <Panel className="corens-stack corens-gap-sm">
        <div className="corens-row corens-row-between">
          <div className="corens-stack corens-gap-xs">
            <span className="corens-eyebrow">Аккаунт</span>
            <h2 className="corens-section-title">{snapshot.profile.displayName}</h2>
            <p className="corens-copy corens-copy-muted">{snapshot.profile.handle}</p>
          </div>
          <StatusBadge tone="success">Активен</StatusBadge>
        </div>
      </Panel>

      <Section title="Основные настройки">
        <Panel>
          <ListRow
            href="/state-intent"
            title="State и Intent"
            description={`${snapshot.state.current.label} • ${snapshot.intent.current.label}`}
            icon={HeartHandshake}
          />
          <ListRow
            href="/trust-keys"
            title="Ключи доверия"
            description={snapshot.trustKeys.limitLabel}
            icon={KeyRound}
          />
          <ListRow
            href="/privacy"
            title="Приватность"
            description="Видимость, скрытие профиля, удаление"
            icon={Lock}
          />
        </Panel>
      </Section>

      <Section title="Сервисные экраны">
        <Panel>
          <ListRow
            href="/connection"
            title="Связь"
            description="Краткий preview активного match session"
            icon={BadgeInfo}
          />
          <ListRow
            href="/delete"
            title="Удалить аккаунт"
            description="Destructive flow с подтверждением"
            icon={Trash2}
          />
        </Panel>
      </Section>
    </AppSurface>
  );
}
