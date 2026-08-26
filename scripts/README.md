# Scripts

## Conversation pilot export

The pilot export is a read-only operational command. It writes JSON to stdout and
does not expose an HTTP route.

```bash
PILOT_EXPORT_PSEUDONYM_KEY='<at-least-32-character-secret>' \
  corepack pnpm export:conversation-pilot -- \
  --from 2026-08-24 \
  --to 2026-09-07 \
  --cohort pilot-2026-08 > conversation-pilot.json
```

`--from` is inclusive and `--to` is exclusive on `MatchSession.createdAt`.
The cohort label must be a 1–64 character slug. Keep the pseudonymization key
outside shell history and version control; reuse the same key only when stable
match pseudonyms across authorized exports are required.

The JSON contains aggregate counts and pair-level rows keyed only by HMAC-based
pseudonymous match identifiers. It excludes Telegram identifiers, usernames,
links, callback tokens, profile text, and private message content.
