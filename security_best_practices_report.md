# Security Best Practices Review

## Executive Summary

Reviewed the current `Telegram Bot notification cleanup + Mini App auth/navigation` path using the `security-best-practices` guidance for TypeScript/Next.js, React, and Express/Nest-style server code.

No active security findings were confirmed in the reviewed scope.

The cleanup flow is now materially safer than before because:
- message cleanup is no longer exposed via side-effectful `GET`
- cleanup is bound to the authenticated session user on the backend
- the fallback cleanup path runs after successful auth bootstrap instead of trusting a query flag

## Scope Reviewed

- `/Users/eugene.gusakov/Documents/self-projects/corens-mini-app/apps/api/src/auth.controller.ts`
- `/Users/eugene.gusakov/Documents/self-projects/corens-mini-app/apps/api/src/profile.controller.ts`
- `/Users/eugene.gusakov/Documents/self-projects/corens-mini-app/apps/api/src/telegram/bot-notification.service.ts`
- `/Users/eugene.gusakov/Documents/self-projects/corens-mini-app/apps/api/src/telegram/bot-webhook.service.ts`
- `/Users/eugene.gusakov/Documents/self-projects/corens-mini-app/apps/miniapp/src/app/actions.ts`
- `/Users/eugene.gusakov/Documents/self-projects/corens-mini-app/apps/miniapp/src/components/notification-cleanup.tsx`
- `/Users/eugene.gusakov/Documents/self-projects/corens-mini-app/apps/miniapp/src/app/auth/bootstrap/route.ts`
- `/Users/eugene.gusakov/Documents/self-projects/corens-mini-app/apps/miniapp/src/components/auth-bootstrap.tsx`
- `/Users/eugene.gusakov/Documents/self-projects/corens-mini-app/packages/ui/src/lib/components.tsx`
- nearby auth/session/media code to validate previous concerns were still closed

## Findings

No confirmed findings in the reviewed scope.

## Evidence

### Cleanup is no longer reachable via side-effectful GET

`/Users/eugene.gusakov/Documents/self-projects/corens-mini-app/apps/api/src/profile.controller.ts:35-38`

```ts
  @Post("notifications/cleanup")
  async cleanupNotifications(@AuthenticatedUser() user: AuthenticatedUserContext) {
    await this.notifications.cleanupNotifications(user.telegramUserId);
    return { ok: true };
  }
```

This removes the earlier unsafe pattern where notification deletion could be triggered through a `GET` route.

### Cleanup is bound to the authenticated Telegram user

`/Users/eugene.gusakov/Documents/self-projects/corens-mini-app/apps/api/src/auth.controller.ts:16-27`

```ts
  @Post("bootstrap")
  async bootstrap(@Body() body: unknown) {
    const input = parseAuthBootstrapRequest(body);
    const response = await this.auth.bootstrap(input.initData);

    try {
      await this.notifications.cleanupNotifications(response.user.telegramUserId);
    } catch {
      // Best-effort: notification cleanup must not block session bootstrap.
    }

    return response;
  }
```

The cleanup target comes from the validated bootstrap response, not from client-controlled input.

### Backend deletion only touches records for that Telegram account

`/Users/eugene.gusakov/Documents/self-projects/corens-mini-app/apps/api/src/telegram/bot-notification.service.ts:51-66`

```ts
  async cleanupNotifications(telegramUserId: string): Promise<void> {
    const messages = await this.prisma.clientInstance.botNotificationMessage.findMany({
      where: { telegramUserId }
    });
    ...
    await Promise.allSettled(
      messages.map((msg) =>
        this.botWebhook.getBot().api.deleteMessage(telegramUserId, msg.messageId)
      )
    );
  }
```

There is no cross-user selector or client-provided message id in this path.

### Session cookie posture remains reasonable for this app shape

`/Users/eugene.gusakov/Documents/self-projects/corens-mini-app/apps/miniapp/src/app/auth/bootstrap/route.ts:41-47`

```ts
  nextResponse.cookies.set(MINIAPP_SESSION_COOKIE, payload.sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(payload.expiresAt),
    path: "/"
  });
```

The cookie remains `HttpOnly`; `Secure` is correctly gated to production; `SameSite=Lax` is consistent with the current Mini App flow.

## Residual Checks

These are not current findings, but they are worth keeping under review:

1. Keep `notifications/cleanup` as `POST` only. Reintroducing a mutating `GET` would reopen the main concern.
2. Keep cleanup keyed strictly by authenticated session identity. Do not accept `telegramUserId` or `messageId` from the client.
3. If the Mini App later needs cross-origin POST entrypoints beyond Server Actions and same-origin Route Handlers, explicitly document CSRF assumptions and add token/origin validation where appropriate.
4. Re-run a dedicated security review if the upload/media path changes again; the previously reported upload-proxy and media-deletion issues appear closed in current source.
