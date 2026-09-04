import { describe, expect, it } from "vitest";
import {
  createBioSaveRequest,
  createBioSaveState,
  reconcileBioSaveStateWithServer,
  resolveBioSaveRequest,
  setBioSaveValue,
  settleBioSaveAction
} from "../../apps/miniapp/src/lib/bio-save-state";

describe("bio save state", () => {
  it("preserves a divergent draft when a successful save refreshes the server value", () => {
    const initial = createBioSaveState("Прежнее описание");
    const submitted = setBioSaveValue(initial, "Сохранённое описание");
    const draft = setBioSaveValue(submitted, "Новый черновик");

    expect(reconcileBioSaveStateWithServer(draft, "Сохранённое описание")).toEqual({
      value: "Новый черновик",
      savedValue: "Сохранённое описание",
      revision: 2,
      error: undefined
    });
  });

  it("keeps revised text clear when an earlier rejected save settles", () => {
    const initial = createBioSaveState("Прежнее описание");
    const request = createBioSaveRequest(setBioSaveValue(initial, "t.me/secret"));
    const revised = setBioSaveValue(setBioSaveValue(initial, "t.me/secret"), "Новое описание");

    expect(
      resolveBioSaveRequest(revised, request, {
        error: {
          field: "about",
          category: "contact",
          message: "Не добавляйте ссылки и контактные данные"
        }
      })
    ).toEqual(revised);
  });

  it("turns a rejected save promise into a safe editor error", async () => {
    const state = setBioSaveValue(createBioSaveState(""), "Новое описание");
    const request = createBioSaveRequest(state);
    const result = await settleBioSaveAction(async () => {
      throw new Error("transport detail must not reach the editor");
    });

    expect(resolveBioSaveRequest(state, request, result)).toEqual({
      value: "Новое описание",
      savedValue: "",
      revision: 1,
      error: {
        field: "about",
        category: null,
        message: "Не удалось сохранить описание. Попробуйте ещё раз."
      }
    });
  });
});
