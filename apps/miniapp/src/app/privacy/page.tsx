import { ShieldAlert, Trash2 } from "lucide-react";
import { redirect } from "next/navigation";
import {
  AppSurface,
  Button,
  ButtonLink,
  NoticeCard,
  Panel,
  Section,
  TopBar
} from "@corens/ui";

import { updateVisibilityAction } from "../actions";
import { getProfileSummary } from "../../lib/api";

export default async function PrivacyPage() {
  const snapshot = await getProfileSummary();

  if (!snapshot.onboardingCompleted) {
    redirect("/onboarding");
  }

  return (
    <AppSurface>
      <TopBar title="Приватность" backHref="/profile" />

      <Section
        title="Видимость профиля"
        description="Вы управляете только видимостью профиля. Сам automatic matching работает исключительно по алгоритму и матрице совпадений."
      >
        <Panel>
          <div className="corens-stack corens-gap-sm">
            {snapshot.privacy.switches.map((item) => (
              <div key={item.title} className="corens-switch-row">
                <div className="corens-switch-copy">
                  <strong className="corens-list-title">{item.title}</strong>
                  <span className="corens-list-description">{item.description}</span>
                </div>
                <form action={updateVisibilityAction}>
                  <input type="hidden" name="isHidden" value={item.checked ? "false" : "true"} />
                  <Button variant={item.checked ? "secondary" : "primary"} type="submit">
                    {item.checked ? "Вернуть в подбор" : "Скрыть профиль"}
                  </Button>
                </form>
              </div>
            ))}
          </div>
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
