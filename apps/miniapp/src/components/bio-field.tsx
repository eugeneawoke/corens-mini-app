"use client";

import { useRef, useState, useTransition } from "react";

import { updateAboutAction } from "../app/actions";

interface BioFieldProps {
  initialValue: string | null;
}

export function BioField({ initialValue }: BioFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue ?? "");
  const [, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleActivate = () => {
    setIsEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleBlur = () => {
    setIsEditing(false);
    const trimmed = value.trim();
    if (trimmed !== (initialValue ?? "")) {
      startTransition(() => {
        updateAboutAction(trimmed);
      });
    }
  };

  if (isEditing) {
    return (
      <div className="corens-bio-field">
        <span className="corens-eyebrow">О себе</span>
        <textarea
          ref={textareaRef}
          className="corens-bio-textarea"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleBlur}
          maxLength={200}
          placeholder="Расскажите немного о себе..."
          rows={3}
        />
        <p className="corens-copy corens-copy-muted" style={{ fontSize: 12 }}>
          {value.length}/200
        </p>
      </div>
    );
  }

  return (
    <div
      className="corens-bio-field corens-bio-field-interactive"
      onClick={handleActivate}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handleActivate()}
    >
      <span className="corens-eyebrow">О себе</span>
      {value.trim() ? (
        <p className="corens-copy">{value}</p>
      ) : (
        <p className="corens-copy corens-copy-muted">Добавить о себе...</p>
      )}
    </div>
  );
}
