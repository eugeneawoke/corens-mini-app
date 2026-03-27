"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { updateAboutAction } from "../app/actions";

interface BioFieldProps {
  initialValue: string | null;
}

export function BioField({ initialValue }: BioFieldProps) {
  const [value, setValue] = useState(initialValue ?? "");
  const [, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const initialValueRef = useRef(initialValue ?? "");

  useEffect(() => {
    const nextValue = initialValue ?? "";
    setValue(nextValue);
    initialValueRef.current = nextValue;
  }, [initialValue]);

  const resizeTextarea = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "0px";
    const maxHeight = 160;
    const nextHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  };

  useEffect(() => {
    resizeTextarea();
  }, [value]);

  const handleBlur = () => {
    const trimmed = value.trim();
    if (trimmed !== initialValueRef.current) {
      startTransition(() => {
        updateAboutAction(trimmed);
      });
      initialValueRef.current = trimmed;
    }
  };

  return (
    <div className="corens-bio-field">
      <span className="corens-eyebrow">О себе</span>
      <div className="corens-bio-editor">
        <textarea
          ref={textareaRef}
          className="corens-bio-textarea"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleBlur}
          maxLength={200}
          placeholder="Расскажите немного о себе"
          rows={3}
        />
      </div>
      <p className="corens-copy corens-copy-muted corens-bio-counter">
        {value.length}/200
      </p>
    </div>
  );
}
