# Mailzap — Improvements

Author: chrisbaker (@chrisdjbaker)

This document summarises the bug fixes, performance work, and new features added
to this fork of Mailzap. Everything below builds on the upstream extension
(React 19 + Vite + TypeScript, Manifest V3) and keeps the build, test suite, and
linter green.

---

## 1. Correctness fixes

These were existing bugs in the Gmail API layer.

- **Centralised Gmail transport with bounded retries** (`src/_shared/utils/gmailApi.ts`).
  All Gmail calls now go through one helper with exponential backoff and a hard
  retry cap. This replaced three separate problems in the old ad-hoc retry code:
  - 429/403 responses were retried **forever** with no cap, so a persistent
    error could hang the UI indefinitely.
  - The unsubscribe-header retry passed its arguments in the **wrong order**
    (`(token, messageId)` instead of `(messageId, token)`), breaking any
    rate-limited unsubscribe.
  - **Permanent** 403s (e.g. insufficient permissions) were retried as if they
    were transient. The new helper only retries 429, 5xx, and the genuinely
    transient 403 quota reasons.
- **Zero-result crash fixed** (`fetchMessageIds.ts`). Gmail omits the `messages`
  field entirely when a query has no matches; the old code called
  `data.messages.length`/`.map` and threw, aborting the whole trash/unsubscribe
  flow. It now treats a missing list as empty.
- **`List-Unsubscribe` header parsing fixed** (`utils.ts`). Angle-bracket
  stripping used the untrimmed string length, mangling values that had
  surrounding whitespace. Now stripped correctly.
- **Fetch-progress no longer clobbers other accounts** (`fetchSenders.ts`).
  Progress is merged per-account and reflects messages actually processed,
  instead of overwriting the whole `fetchProgress` object and drifting past 100%.
- **Content-script hardening** (`public/content.js`). DOM lookups are
  null-guarded, and the active Gmail account is detected by matching an email
  pattern in the page title rather than a fixed split position (locale-robust).
- **Removed a broken placeholder uninstall-survey URL** (`public/background.js`).

## 2. Performance

- **Bulk trash via `batchModify`** (`modifySenders.ts`). Trashing now adds the
  `TRASH` label to up to 1000 messages per request instead of one HTTP call per
  message — hundreds of round-trips collapse into a handful for high-volume
  senders, with far less rate-limiting.
- **Sender scan via the multipart batch endpoint** (`gmailApi.ts`,
  `fetchSenders.ts`). Metadata for up to 100 messages is fetched in a single
  batched HTTP call instead of 40 individual GETs.

## 3. Smarter auto-unsubscribe

- **RFC 8058 one-click unsubscribe** (`unsubscribeSenders.ts`). The
  `List-Unsubscribe-Post` one-click POST is now the preferred path (it was dead
  code before), so far more senders unsubscribe automatically with no email sent
  and no manual clicking. Resolution order is: one-click POST → mailto → manual
  link → none.
- **Nested email bodies handled.** Body link-scraping now walks the full MIME
  tree, so unsubscribe links in nested `multipart/alternative` bodies (very
  common) are found instead of missed.

---

## New features

## 4. Incremental sync

`src/_shared/utils/syncSenders.ts`, `senderStore.ts`

A refresh no longer re-scans the entire mailbox. The full scan now records the
Gmail `historyId` and a message → sender index; subsequent refreshes call
`history.list` and apply **only** the messages added or deleted since the last
sync. If the history cursor has expired (Gmail returns 404), it transparently
falls back to a full rescan. The message index stores each message's size so
deletions decrement both count and size accurately.

> Added the `unlimitedStorage` permission to accommodate the message index on
> large mailboxes.

## 5. Storage-size insights + Archive

- Each message's `sizeEstimate` is captured for free during the scan (same API
  response), so the UI shows **per-sender storage size** and can **sort by size**
  to target space hogs.
- New **Archive** action removes a sender's mail from the Inbox without trashing
  it (`removeLabelIds: ["INBOX"]`), via the same batched path as trash.

## 6. Per-sender drill-down + Undo

- **Preview** (👁 on each sender) shows a sender's most recent subjects and
  snippets before you act on them (`senderPreview.ts`).
- **Undo**: trashing records the affected message ids; the success modal offers
  an Undo that restores them (remove `TRASH`, restore `INBOX`). Recoverable
  because Gmail keeps trashed mail ~30 days.

## 7. Saved auto-clean rules

`src/_shared/utils/rules.ts`

Create rules that automatically trash or archive future mail from a sender.
These are implemented as **Gmail server-side filters** (create / list / delete),
so Gmail applies them itself — no background polling required, and they persist
across devices. Managed from a new Rules panel. (`blockSender` now routes
through the same machinery.)

## 8. Search, sort & select-all

The sender list gained a search box, a sort selector (most emails / largest size
/ name A–Z), and a "select all visible" checkbox.

## 9. Safety net

Confirmation dialogs now show how much **storage will be freed**, use clearer
destructive-action wording, and keep "Show all emails" as a dry-run preview.

## 10. Continuous integration

Restored a GitHub Actions workflow (`.github/workflows/ci.yml`) that runs the
build, the Jest test suite, and ESLint on every push and pull request.

---

## Testing

A Jest suite was restored and expanded to **49 tests** covering the new and
fixed logic: the retry/backoff transport, batch-response parsing, empty-result
handling, header parsing, store conversions, trash/archive/undo, rules mapping,
history-delta collection, size formatting, and sender aggregation.

```bash
npm run build   # type-check + production build
npm test        # jest
npx eslint src  # lint
```

## Trying the extension

```bash
npm run build               # outputs dist/
# Chrome → Extensions → Load unpacked → select dist/
```

All new Gmail calls are covered by the existing OAuth scopes (`gmail.modify`,
`gmail.settings.basic`), so no new consent screen is required. Loading the new
build will prompt to accept the added `unlimitedStorage` permission.
