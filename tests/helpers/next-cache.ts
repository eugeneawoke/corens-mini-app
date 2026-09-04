export const revalidatedPaths: string[] = [];
export const revalidatedTags: string[] = [];

export function revalidatePath(path: string): void {
  revalidatedPaths.push(path);
}

export function revalidateTag(tag: string): void {
  revalidatedTags.push(tag);
}

export function resetNextCache(): void {
  revalidatedPaths.length = 0;
  revalidatedTags.length = 0;
}
