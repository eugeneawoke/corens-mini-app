import { AlertTriangle } from "lucide-react";
import {
  AppSurface,
  ButtonLink,
  Field,
  NoticeCard,
  Panel,
  Section,
  TopBar
} from "@corens/ui";

import { getProfileSummary } from "../../lib/api";

export default async function DeletePage() {
  const snapshot = await getProfileSummary();

  return (
    <AppSurface
      bottomBar={
        <div className="corens-action-stack">
          <ButtonLink href="/profile" variant="danger">
            Удалить навсегда
          </ButtonLink>
          <ButtonLink href="/profile" variant="ghost">
            Отмена
          </ButtonLink>
        </div>
      }
    >
      <TopBar title="Удаление аккаунта" backHref="/privacy" />

      <NoticeCard
        icon={AlertTriangle}
        title="Это действие необратимо"
        description="Все связи, настройки приватности и связанные артефакты будут удалены согласно privacy workflow."
        tone="danger"
      />

      <Section title="Что выполнит backend">
        <Panel>
          <ol className="corens-delete-steps">
            {snapshot.privacy.deletionPlan.stages.map((stage) => (
              <li key={stage}>{stage}</li>
            ))}
          </ol>
        </Panel>
      </Section>

      <Section title="Подтверждение">
        <Field
          label='Введите "удалить"'
          placeholder="удалить"
          hint="Финальный destructive flow должен проверяться на backend перед запуском purge."
        />
      </Section>
    </AppSurface>
  );
}
