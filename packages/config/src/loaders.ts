import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import type { ZodSchema } from "zod";

export interface ConfigLoadResult<T> {
  version: string;
  data: T;
}

export function createYamlLoader<T>(configName: string, schema: ZodSchema<T>) {
  return async function loadYamlConfig(filePath: string): Promise<ConfigLoadResult<T>> {
    const content = await readFile(filePath, "utf8");
    const parsed = parse(content);
    const data = schema.parse(parsed);

    return {
      version: String((parsed as { version?: string }).version ?? "unknown"),
      data
    };
  };
}
