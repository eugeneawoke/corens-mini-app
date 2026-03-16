import { ShieldAlert, Trash2 } from "lucide-react";
import { redirect } from "next/navigation";
import {
  AppSurface,
  ButtonLink,
  NoticeCard,
  Panel,
  Section,
  SwitchRow,
  TopBar
} from "@corens/ui";

import { getProfileSummary } from "../../lib/api";

export default async function PrivacyPage() {
  const snapshot = await getProfileSummary();

  if (!snapshot.onboardingCompleted) {
    redirect("/onboarding");
  }

  return (
    <AppSurface bottomBar={<ButtonLink href="/profile">Сохранить настройки</ButtonLink>}>
      <TopBar title="Приватность" backHref="/profile" />

      <Section
        title="Видимость профиля"
        description="Переключатели ниже пока рендерятся из shared snapshot, но опираются на те же privacy rules, что и backend сервис."
      >
        <Panel>
          {snapshot.privacy.switches.map((item) => (
            <SwitchRow
              key={item.title}
              title={item.title}
              description={item.description}
              checked={item.checked}
            />
          ))}
        </Panel>
      </Section>

      <NoticeCard
        icon={ShieldAlert}
        title="Как это работает"
        description={snapshot.privacy.privacyCopy}
      />

      <Section title="Удаление">
        <Panel tone="danger">
          <div className="corens-stack corens-gap-sm">
            <div className="corens-inline-head">
              <Trash2 size={18} />
              <strong className="corens-card-title">Delete flow</strong>
            </div>
            <p className="corens-copy corens-copy-muted">
              План удаления уже рассчитывается через shared privacy policy и может быть отображен пользователю до подтверждения.
            </p>
            <ButtonLink href="/delete" variant="ghost">
              Открыть удаление аккаунта
            </ButtonLink>
          </div>
        </Panel>
      </Section>
    </AppSurface>
  );
}
