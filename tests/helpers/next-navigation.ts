export class RedirectSignal extends Error {
  constructor(readonly location: string) {
    super(`redirect:${location}`);
  }
}

export function redirect(location: string): never {
  throw new RedirectSignal(location);
}
