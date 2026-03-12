import { Heart, MoonStar, Orbit, Sparkle } from "lucide-react";
import { AppSurface, ButtonLink, ChoiceTile, NoticeCard, Panel, Section, TopBar } from "@corens/ui";

import { getProfileSummary } from "../../lib/api";

const stateIcons = [Heart, MoonStar, Sparkle, Orbit];

export default async function StateIntentPage() {
  const snapshot = await getProfileSummary();

  return (
    <AppSurface
      bottomBar={<ButtonLink href="/profile">Сохранить изменения</ButtonLink>}
    >
      <TopBar title="State и Intent" backHref="/profile" />

      <Section
        title="Как вы сейчас?"
        description="Первый блок описывает текущее состояние и помогает matching policy выбрать корректный контекст."
      >
        <div className="corens-choice-grid">
          {snapshot.state.options.map((option, index) => {
            const Icon = stateIcons[index % stateIcons.length];

            return (
              <ChoiceTile
                key={option.key}
                title={option.label}
                description={option.description}
                icon={Icon}
                selected={option.key === snapshot.state.current.key}
              />
            );
          })}
        </div>
      </Section>

      <Panel tone="muted">
        <div className="corens-stack corens-gap-sm">
          <strong className="corens-card-title">Текущее описание</strong>
          <p className="corens-copy corens-copy-muted">
            {snapshot.state.current.description}
          </p>
          <span className="corens-eyebrow corens-mono">{snapshot.state.cooldownLabel}</span>
        </div>
      </Panel>

      <Section
        title="Какой ритм контакта вам нужен?"
        description="Intent меняет ожидание от взаимодействия и должен быть предельно ясным."
      >
        <div className="corens-choice-grid">
          {snapshot.intent.options.map((option, index) => {
            const Icon = stateIcons[(index + 1) % stateIcons.length];

            return (
              <ChoiceTile
                key={option.key}
                title={option.label}
                description={option.description}
                icon={Icon}
                selected={option.key === snapshot.intent.current.key}
              />
            );
          })}
        </div>
      </Section>

      <NoticeCard
        title="Сохранение"
        description="На реальном backend этот экран должен писать в profile API и показывать cooldown, пришедший от сервера."
      />
    </AppSurface>
  );
}
