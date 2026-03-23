"use client";

import { updateVisibilityAction } from "../app/actions";

type Props = {
  title: string;
  description: string;
  isHidden: boolean;
};

export function VisibilityToggle({ title, description, isHidden }: Props) {
  return (
    <div className="corens-switch-row">
      <div className="corens-switch-copy">
        <strong className="corens-list-title">{title}</strong>
        <span className="corens-list-description">{description}</span>
      </div>
      <form action={updateVisibilityAction}>
        <input type="hidden" name="isHidden" value={isHidden ? "false" : "true"} />
        <button
          type="submit"
          className={`corens-switch ${isHidden ? "corens-switch-warning" : ""}`}
          aria-label={isHidden ? "Вернуться в поиск" : "Скрыться из поиска"}
        >
          <span className="corens-switch-thumb" />
        </button>
      </form>
    </div>
  );
}
