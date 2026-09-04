let sessionToken: string | undefined;

export async function cookies() {
  return {
    get: () => sessionToken ? { value: sessionToken } : undefined
  };
}

export function setNextSessionToken(value: string | undefined): void {
  sessionToken = value;
}
