"use client";

import { startTransition, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, NoticeCard, Panel } from "@corens/ui";
import type { PhotoSummary, PhotoUploadIntent } from "@corens/domain";

type PhotoManagerProps = {
  summary: PhotoSummary;
};

export function PhotoManager({ summary }: PhotoManagerProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"upload" | "delete" | null>(null);

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const file = fileInputRef.current?.files?.[0];

    if (!file) {
      setError("Сначала выберите файл.");
      return;
    }

    setPending("upload");

    try {
      const intentResponse = await fetch("/api/media/photo/upload-intent", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          contentType: file.type
        })
      });

      if (!intentResponse.ok) {
        throw new Error("Не получилось подготовить загрузку фото.");
      }

      const intent = (await intentResponse.json()) as PhotoUploadIntent;

      if (file.size > intent.maxBytes) {
        throw new Error("Файл слишком большой для загрузки.");
      }

      const fileHash = await sha1Hex(file);
      const uploadResponse = await fetch(intent.uploadUrl, {
        method: "POST",
        headers: {
          Authorization: intent.authorizationToken,
          "Content-Type": file.type,
          "X-Bz-File-Name": encodeURIComponent(intent.objectKey),
          "X-Bz-Content-Sha1": fileHash
        },
        body: file
      });

      if (!uploadResponse.ok) {
        throw new Error("Загрузка в хранилище не удалась.");
      }

      const uploadPayload = (await uploadResponse.json()) as { fileId?: string };

      if (!uploadPayload.fileId) {
        throw new Error("Хранилище не вернуло идентификатор файла.");
      }

      const confirmResponse = await fetch("/api/media/photo/confirm", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          intentToken: intent.intentToken,
          fileId: uploadPayload.fileId,
          contentType: file.type,
          sizeBytes: file.size
        })
      });

      if (!confirmResponse.ok) {
        throw new Error("Не получилось подтвердить загрузку фото.");
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Что-то пошло не так.");
    } finally {
      setPending(null);
    }
  }

  async function handleDelete() {
    setError(null);
    setPending("delete");

    try {
      const response = await fetch("/api/media/photo", {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error("Не получилось удалить фото.");
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Что-то пошло не так.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="corens-stack corens-gap-sm">
      {summary.hasPhoto && summary.previewUrl ? (
        <Panel>
          <img
            src={summary.previewUrl}
            alt="Ваше фото"
            style={{ width: "100%", borderRadius: 24, objectFit: "cover" }}
          />
        </Panel>
      ) : null}

      <form onSubmit={handleUpload} className="corens-stack corens-gap-sm">
        <label className="corens-field-wrap">
          <span className="corens-field-label">
            {summary.hasPhoto ? "Заменить фото" : "Загрузить фото"}
          </span>
          <input
            ref={fileInputRef}
            className="corens-field"
            type="file"
            accept="image/png,image/jpeg,image/webp"
          />
          <span className="corens-field-hint">Один файл до 5 МБ. Форматы: JPG, PNG, WEBP.</span>
        </label>
        <Button type="submit" disabled={pending !== null}>
          {pending === "upload"
            ? "Загружаем..."
            : summary.hasPhoto
              ? "Заменить фото"
              : "Загрузить фото"}
        </Button>
      </form>

      {summary.hasPhoto ? (
        <Button type="button" variant="danger" onClick={handleDelete} disabled={pending !== null}>
          {pending === "delete" ? "Удаляем..." : "Удалить фото"}
        </Button>
      ) : null}

      {error ? (
        <NoticeCard title="Не получилось обработать фото" description={error} tone="danger" />
      ) : null}
    </div>
  );
}

async function sha1Hex(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-1", buffer);
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}
