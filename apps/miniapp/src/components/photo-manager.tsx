"use client";

import { Camera } from "lucide-react";
import { startTransition, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, NoticeCard } from "@corens/ui";
import type { PhotoSummary, PhotoUploadIntent } from "@corens/domain";

type PhotoManagerProps = {
  summary: PhotoSummary;
};

export function PhotoManager({ summary }: PhotoManagerProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"upload" | "delete" | null>(null);

  async function uploadFile(file: File) {
    setError(null);
    setPending("upload");

    try {
      const intentResponse = await fetch("/api/media/photo/upload-intent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contentType: file.type })
      });

      if (!intentResponse.ok) {
        throw new Error("Не получилось подготовить загрузку.");
      }

      const intent = (await intentResponse.json()) as PhotoUploadIntent;

      if (file.size > intent.maxBytes) {
        throw new Error("Файл слишком большой.");
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
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          intentToken: intent.intentToken,
          fileId: uploadPayload.fileId,
          contentType: file.type,
          sizeBytes: file.size
        })
      });

      if (!confirmResponse.ok) {
        throw new Error("Не получилось подтвердить загрузку.");
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
      const response = await fetch("/api/media/photo", { method: "DELETE" });

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

  if (!summary.hasPhoto) {
    return (
      <div className="corens-stack corens-gap-sm">
        <label
          className="corens-photo-upload-area"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            padding: "36px 24px",
            borderRadius: "var(--corens-radius-card)",
            border: "2px dashed var(--corens-border)",
            background: "rgba(255,255,255,0.7)",
            cursor: pending ? "default" : "pointer",
            opacity: pending ? 0.6 : 1,
            transition: "border-color 150ms ease"
          }}
        >
          <Camera size={32} color="var(--corens-text-secondary)" />
          <span className="corens-card-title" style={{ color: "var(--corens-text-secondary)" }}>
            {pending === "upload" ? "Загружаем..." : "Добавить фото"}
          </span>
          <span style={{ fontSize: "13px", color: "var(--corens-text-tertiary)", textAlign: "center" }}>
            JPG, PNG, WEBP или HEIC · до 5 МБ
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/heic,image/heif"
            disabled={pending !== null}
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadFile(file);
            }}
          />
        </label>

        {error && (
          <NoticeCard
            title="Не получилось загрузить фото"
            description={`${error} Используйте JPG, PNG, WEBP или HEIC не тяжелее 5 МБ.`}
            tone="danger"
          />
        )}
      </div>
    );
  }

  return (
    <div className="corens-stack corens-gap-sm">
      {summary.previewUrl && (
        <img
          src={summary.previewUrl}
          alt="Ваше фото"
          style={{ width: "100%", borderRadius: "var(--corens-radius-card)", objectFit: "cover" }}
        />
      )}

      <label
        className="corens-field-wrap"
        style={{ cursor: pending ? "default" : "pointer" }}
      >
        <span className="corens-field-label">Заменить фото</span>
        <input
          ref={fileInputRef}
          className="corens-field"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/heic,image/heif"
          disabled={pending !== null}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void uploadFile(file);
          }}
        />
        <span className="corens-field-hint">JPG, PNG или WEBP · до 5 МБ</span>
      </label>

      <Button type="button" variant="danger" onClick={handleDelete} disabled={pending !== null}>
        {pending === "delete" ? "Удаляем..." : "Удалить фото"}
      </Button>

      {error && (
        <NoticeCard
          title="Не получилось обработать фото"
          description={`${error} Используйте JPG, PNG, WEBP или HEIC не тяжелее 5 МБ.`}
          tone="danger"
        />
      )}
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
