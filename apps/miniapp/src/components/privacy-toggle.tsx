"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleVisibilityAction } from "../app/actions";

type Props = {
  title: string;
  description: string;
  isHidden: boolean;
};

export function VisibilityToggle({ title, description, isHidden }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      await toggleVisibilityAction(!isHidden);
      router.refresh();
    });
  }

  return (
    <div className="corens-switch-row">
      <div className="corens-switch-copy">
        <strong className="corens-list-title">{title}</strong>
        <span className="corens-list-description">{description}</span>
      </div>
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        className={`corens-switch ${isHidden ? "corens-switch-warning" : ""}`}
        aria-label={isHidden ? "Вернуться в поиск" : "Скрыться из поиска"}
        style={{ opacity: isPending ? 0.6 : 1 }}
      >
        <span className="corens-switch-thumb" />
      </button>
    </div>
  );
}
