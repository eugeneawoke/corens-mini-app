# Security Best Practices Report

Дата: 2026-03-29

## Executive Summary

Повторная проверка `corens-mini-app` по текущему MVP-стеку (`NestJS + Express + Prisma` на backend, `Next.js 15 + React 19` на frontend) показывает, что ранее найденные findings закрыты, включая два дополнительных пункта из повторного security review. Критичных, high- или medium-severity уязвимостей в текущем коде я не подтверждаю. На текущем проходе остаются только residual notes: runtime edge/WAF/body-limit enforcement вне репозитория и отсутствие динамической проверки в production-like окружении.

Источники истины, использованные при оценке: `PLAN.md`, `TODO.md`, `DECISIONS.md`, `EVIDENCE.md`, `SECURITY.md`, `API-CONTRACT.md`, `docs/architecture/mvp-architecture.md`, `docs/architecture/open-questions.md`, `config/**/*.v1.yaml`.

## Status Snapshot

| Finding | Initial Severity | Current Status | Closed At |
|---|---|---|---|
| SBP-001 | High | CLOSED | 2026-03-29 |
| SBP-002 | High | CLOSED | 2026-03-29 |
| SBP-003 | Medium | CLOSED | 2026-03-29 |
| SBP-004 | Medium | CLOSED | 2026-03-29 |
| SBP-005 | Medium | CLOSED | 2026-03-29 |
| SBP-006 | Low | CLOSED | 2026-03-29 |
| CC-001 | Medium | CLOSED | 2026-03-29 |
| CC-002 | Low | CLOSED | 2026-03-29 |
| CC-003 | Low | CLOSED | 2026-03-29 |

## Current Open Findings

На текущем проходе открытых findings не осталось.

### SBP-005

- Severity: Medium
- Status: CLOSED on 2026-03-29
- Rule ID: NEXT-FILE-001
- Location: `apps/miniapp/src/app/api/media/photo/upload-proxy/route.ts:64-113`, `apps/api/src/modules/media/service.ts:111-123`
- Original finding:
  - upload proxy не делал server-side size enforcement до отправки файла в storage и не нёс `maxBytes` в signed intent.
- Why it mattered:
  - это оставляло вектор на oversized upload, лишнее потребление памяти и orphaned uploads при обходе клиентской проверки размера.
- Closure note:
  - proxy теперь режет oversized request по `content-length` до разбора body, сверяет `file.size` на сервере и требует `maxBytes` внутри signed intent.

### SBP-006

- Severity: Low
- Status: CLOSED on 2026-03-29
- Rule ID: NEXT-HEADERS-002
- Location: `apps/miniapp/next.config.ts:3-15`
- Original finding:
  - CSP была слишком широкой, особенно по `connect-src https:` и `img-src https:`.
- Why it mattered:
  - при XSS такая policy хуже сдерживает exfiltration и произвольные outbound requests.
- Closure note:
  - CSP сужена до конкретных origin’ов Telegram и self, а широкие `https:` из `connect-src`/`img-src` убраны.

## Critical / High

### SBP-001

- Severity: High
- Status: CLOSED on 2026-03-29
- Rule ID: NEXT-SSRF-001
- Location: `apps/miniapp/src/app/api/media/photo/upload-proxy/route.ts:8-41`
- Evidence:

```ts
export async function POST(request: Request): Promise<Response> {
  const formData = await request.formData();
  const uploadUrl = formData.get("uploadUrl") as string | null;
  const authorizationToken = formData.get("authorizationToken") as string | null;
  ...
  const b2Response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: authorizationToken,
```

- Impact: внешний атакующий может использовать публичный Next.js route как blind proxy для POST-запросов на произвольный `uploadUrl` с произвольным `Authorization` header и произвольным телом файла; это даёт SSRF/open relay primitive против внутренних сервисов, metadata endpoints или сторонних API.
- Why this is a finding:
  - route не требует backend session и не использует `proxyMiniAppApi`;
  - `uploadUrl`, `authorizationToken` и `objectKey` полностью приходят от клиента;
  - хост, схема и назначение URL никак не проверяются.
- Fix:
  - закрыть route backend-session проверкой или убрать его из публичного surface;
  - не доверять `uploadUrl` из клиента: на сервере валидировать host allowlist для Backblaze B2 и связывать upload с server-issued intent;
  - лучше перенести сам upload в `apps/api` и принимать только `intentToken`, а все storage credentials восстанавливать на backend.
- Mitigation:
  - до исправления хотя бы валидировать `uploadUrl` на exact/allowlisted B2 origins и отбрасывать любые non-HTTPS / non-B2 URL;
  - добавить rate limiting на route.
- False positive notes:
  - finding перестанет быть актуальным только если этот route уже закрыт на edge/WAF или приватной сетью; в коде таких ограничений не видно.
- Closure note:
  - route переведён на signed `intentToken`, требует Mini App session и больше не принимает `uploadUrl`/`authorizationToken`/`objectKey` напрямую из клиента.

### SBP-002

- Severity: High
- Status: CLOSED on 2026-03-29
- Rule ID: PRIV-MEDIA-001
- Location: `apps/api/src/modules/media/service.ts:259-272`, `apps/api/src/modules/media/service.ts:217-241`
- Evidence:

```ts
const token = this.signPayload({
  kind: "photo_access",
  objectKey,
  exp: this.expiresAt(ACCESS_TOKEN_TTL_SECONDS)
});
...
const payload = this.verifyPayload(accessToken);
if (payload.kind !== "photo_access") {
  throw new ForbiddenException("Photo access token is invalid");
}

const photo = await this.prisma.clientInstance.userPhoto.findFirst({
  where: {
    objectKey: payload.objectKey,
    status: "ready"
  }
});
```

- Impact: любой, кто получил `imageUrl`, может использовать его независимо от своей сессии, match membership и текущего consent state в течение TTL токена; это ослабляет требование из `SECURITY.md`, что media access должен оставаться server-enforced.
- Why this is a finding:
  - access token содержит только `objectKey` и `exp`;
  - при `streamPhoto` не проверяются `viewerUserId`, `matchSessionId`, `channel`, `consent status` или даже наличие backend session;
  - URL возвращается как bearer-secret, который можно переслать дальше.
- Fix:
  - привязать token минимум к `viewerUserId`, `matchSessionId`, `photoOwnerUserId` и `channel=photo_reveal`;
  - endpoint `GET /media/photo/access` должен требовать backend session и сверять, что текущий user всё ещё участник active match с approved photo consent;
  - если нужен signed URL, он должен быть одноразовым или краткоживущим и проверять audience/subject.
- Mitigation:
  - сократить TTL ещё сильнее и запретить кеширование за пределами приватного клиента;
  - не отдавать прямой URL в UI, а проксировать картинку через authenticated endpoint.
- False positive notes:
  - finding не актуален только если URL никогда не покидает доверенный server context; сейчас он явно уходит в клиент как `imageUrl`/`previewUrl`.
- Closure note:
  - photo access теперь идёт через authenticated proxy на Mini App стороне, backend `media/photo/access` защищён session guard, а signed token привязан к `viewerUserId` и, для reveal, к `matchSessionId`.

## Medium

### SBP-003

- Severity: Medium
- Status: CLOSED on 2026-03-29
- Rule ID: NEXT-HEADERS-001
- Location: `apps/api/src/server.ts:21-25`, `apps/miniapp/next.config.ts:5-18`, `apps/miniapp/src/app/layout.tsx:28`
- Evidence:

```ts
app.enableCors({
  origin: [env.TELEGRAM_MINI_APP_URL, "http://localhost:3000", "http://127.0.0.1:3000"],
  credentials: true
});
```

```ts
async headers() {
  return [
    {
      source: "/((?!_next/static|_next/image|favicon).*)",
      headers: [
        { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }
      ]
    }
  ];
}
```

```tsx
<Script src="https://telegram.org/js/telegram-web-app.js?61" strategy="beforeInteractive" />
```

- Impact: приложение не задаёт базовый набор security headers (`Content-Security-Policy`, `X-Frame-Options`/`frame-ancestors`, `X-Content-Type-Options`, `Referrer-Policy`), при этом исполняет внешний script до интерактива; при XSS или ошибке в третьей стороне blast radius будет выше, чем должен быть.
- Why this is a finding:
  - в backend bootstrap нет `helmet()` или явной header policy;
  - в `next.config.ts` заданы только cache headers;
  - Mini App зависит от внешнего Telegram script, но CSP в repo не видно.
- Fix:
  - добавить baseline security headers для `apps/api`;
  - задать CSP/`frame-ancestors`/`nosniff`/`referrer-policy` для `apps/miniapp`;
  - задокументировать допустимые script/connect/frame origins для Telegram Mini App.
- Mitigation:
  - если заголовки ставятся на Vercel/Railway или прокси, это нужно явно зафиксировать в `SECURITY.md` или deployment docs и проверить runtime headers.
- False positive notes:
  - часть защиты может жить на edge; в коде это не видно, поэтому finding остаётся как “not visible in app code”.
- Closure note:
  - добавлены baseline security headers для `apps/api` и CSP / `nosniff` / `referrer-policy` / frame policy для `apps/miniapp`.

### SBP-004

- Severity: Medium
- Status: CLOSED on 2026-03-29
- Rule ID: LOG-PII-001
- Location: `apps/api/src/telegram/bot-notification.service.ts:75-86`, `SECURITY.md:18-24`
- Evidence:

```ts
this.logger.warn(`Failed to send notification to ${telegramUserId}: ${error}`);
```

`SECURITY.md` прямо фиксирует:

```md
Treat as sensitive:
- Telegram identifiers
```

- Impact: Telegram user identifiers попадают в обычные application logs; это увеличивает объём PII в лог-системах и противоречит проектным guardrails по приватности.
- Fix:
  - убрать `telegramUserId` из текстового сообщения или маскировать его;
  - логировать только внутренний trace/context id и безопасную категорию ошибки;
  - при необходимости сохранять полную связь user-to-error только в отдельном audit-safe хранилище.
- Mitigation:
  - срочно проверить ретеншн и доступ к существующим логам.
- False positive notes:
  - если эти warn-логи вообще не уходят во внешнюю систему, impact ниже, но policy violation всё равно остаётся.
- Closure note:
  - `telegramUserId` убран из стандартного warn-сообщения; лог теперь сообщает только безопасную категорию ошибки.

## Low

Отдельных новых low-severity finding’ов на этом проходе не выношу.

## Remediation Status

1. `upload-proxy` закрыт и больше не является open relay.
2. Photo reveal переведён на authenticated access check.
3. HTTP hardening baseline добавлен в repo-конфигурацию.
4. Telegram identifiers убраны из обычных логов.
5. Constant-time webhook secret compare внедрён.
6. Session token hashing переведён на HMAC.
7. Runtime validation/parsing добавлен на API-границе.
8. Upload proxy теперь enforce’ит размер файла на сервере.
9. CSP miniapp сужена до явного allowlist.

## Additional Closed Findings

Ниже перечислены дополнительные findings, отдельно поднятые Claude Code и перепроверенные по коду. Они тоже закрыты по состоянию на 2026-03-29.

### CC-001

- Severity: Medium
- Status: CLOSED on 2026-03-29
- Rule ID: TG-WEBHOOK-001
- Location: `packages/telegram/src/lib/webhook.ts:1-11`
- Original finding:
  - сравнение webhook secret делалось через обычный `===`, а не через constant-time compare.
- Why it mattered:
  - для секретов webhook безопаснее использовать `timingSafeEqual`, чтобы не оставлять лишний side-channel на сравнении секрета.
- Closure note:
  - helper переведён на `timingSafeEqual` с предварительной проверкой длины буферов.

### CC-002

- Severity: Low
- Status: CLOSED on 2026-03-29
- Rule ID: AUTH-HASH-001
- Location: `apps/api/src/modules/auth/service.ts:184-188`
- Original finding:
  - session token secret хешировался как `sha256(secret + ":" + token)` вместо HMAC.
- Why it mattered:
  - для keyed hashing корректнее и устойчивее использовать HMAC, а не ad-hoc prefix/suffix composition.
- Closure note:
  - session token hashing переведён на `createHmac("sha256", SESSION_SECRET).update(tokenSecret)`.

### CC-003

- Severity: Low
- Status: CLOSED on 2026-03-29
- Rule ID: API-VALIDATION-001
- Location: `apps/api/src/server.ts:21-40`, `apps/api/src/request-validation.ts:1-188`, `apps/api/src/*.controller.ts`
- Original finding:
  - на API-границе не было глобального validation слоя, а DTO shapes принимались слишком доверчиво.
- Why it mattered:
  - TypeScript interfaces не валидируют runtime input; без серверной проверки можно протащить неверные типы, oversized payloads и неожиданные структуры в бизнес-логику.
- Closure note:
  - добавлен глобальный `ValidationPipe`, а также явный runtime validation/parsing слой для auth, profile, beacon, consent, privacy, moderation и media request bodies.

## Residual Risks / Gaps

- Отчёт основан на коде репозитория; runtime edge/WAF/header config вне repo не проверялась.
- Полноценный dynamic test в production-like окружении не запускался; выводы основаны на статическом анализе и локальных тестах кода.
