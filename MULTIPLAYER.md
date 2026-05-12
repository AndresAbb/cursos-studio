# Co-learning / Multiplayer — How it works

Cursos Studio's co-learning feature lets you share minimal study presence signals
with friends. All data remains private by default; sharing is always explicit,
per-friend, and per-signal.

---

## Concepts

### What is shared — and what isn't

| Signal | What the friend sees | Requires |
|---|---|---|
| **Studying** | "Alice está estudiando — Diseño UX" | `shareStudying` on |
| **Progress** | "Alice completó «Módulo 3»" | `shareProgress` on |
| **Upcoming exam** | "Alice tiene un examen la próxima semana" | `shareExamUpcoming` on, exam within 7 days |
| **Poke** | Emoji ping, no data attached | Pokes not muted |

**Exam scores are never shared.** The "upcoming exam" notice is a single boolean
signal sent at most once per 5-minute window during the 7 days before the exam.

### What is never shared

- Course content, notes, grades, stickers
- Specific exam dates or question content
- Any data you haven't explicitly enabled via a toggle

---

## Deployment scenarios

### Scenario A — Shared server (simplest)

Both users connect to the **same** Cursos Studio instance (e.g., one person hosts
it on a LAN machine or with a tunnel like ngrok/Tailscale and both open it in
their own browser tab).

```
Alice's browser ──┐
                  ├──▶  Single server (port 3000)  ◀──── MongoDB
Bob's browser   ──┘
```

- Presence events go through the shared WebSocket server and arrive instantly.
- Each browser is effectively an independent user session (cookies/localStorage
  are per-browser, so each person has their own identity name/emoji).
- **No extra configuration needed.** Just share the server URL.

### Scenario B — Separate instances (peer-to-peer)

Each person runs their **own** Cursos Studio on their own machine. For events to
reach each other, at least the sender's server must be reachable from the
receiver's machine (LAN IP, Tailscale address, or public URL).

```
Alice's server (192.168.1.10:3000) ◀───── Bob POSTs presence events
Bob's server   (192.168.1.20:3000) ◀───── Alice POSTs presence events
```

Each side needs the other's **pushToken** (obtained during the invite flow) and
the other's **server URL** saved in the friend record.

---

## Connecting with a friend

### Step 1 — Set your identity (once)

Open the Friends panel (👥 button, top-right). Set your name and emoji, then
**Guardar**. This identity is what friends will see.

### Step 2 — Generate an invite link

Click **+ Generar enlace**. Copy the link and send it to your friend via any
channel (chat, email, etc.).

The link looks like:
```
http://your-host:3000/?accept-friend=TOKEN&from=USERID&name=Alice&emoji=🎓&url=http://your-host:3000
```

### Step 3 — Friend accepts

**Shared server:** Your friend opens the link in their browser. A modal appears.
They click **Aceptar**. Done — both sides have a friend record immediately.

**Separate instances:** Your friend clicks **Pegar enlace de amigo** in *their
own* Friends panel, pastes your invite link, and clicks **Conectar**. This:

1. Calls your server to consume the invite token and store Bob's info
2. Creates a matching record on Bob's server pointing back to your server
3. Both sides can now push presence events to each other

### Step 4 — Configure sharing

Each friend card in the panel has independent toggles:

- **Comparto: estudiando** — emit when you open a course
- **Comparto: progreso** — emit when you mark a module done
- **Comparto: próximo examen** — emit when an ai-exam module falls in the next 7 days
- **Silenciar su actividad** — stop receiving their presence updates
- **Silenciar pokes** — stop receiving their pokes

All toggles are independent. Disabling one does not affect others.

---

## Pokes

Click 👋 on a friend's card to send a poke. Pokes are lightweight emoji
notifications with no data attached.

**Rate limit:** 1 poke per friend per hour. Excess pokes are silently dropped
(no error shown). Each friend can independently mute your pokes without
notifying you.

---

## Rate limits

| Action | Limit | Excess |
|---|---|---|
| Presence events (per friend, per type) | 1 per 5 minutes | Silently dropped |
| Pokes (per friend) | 1 per hour | Silently dropped |

Rate limits reset on server restart. They exist to prevent presence spam and
are enforced server-side regardless of what the client sends.

---

## Privacy guarantees

- **No implicit sharing.** Nothing is sent unless the specific toggle is enabled.
- **Mute is local-only.** Muting a friend does not notify them.
- **Block is local-only.** Blocking a friend does not notify them. Their events
  stop arriving; any events they send are silently rejected by your server.
- **Invite tokens are one-time.** A token is consumed on first use and cannot
  be reused.
- **Unknown event types are silently dropped** on both WebSocket and REST paths.
- **No chat, no file transfer, no voice.** Only the four defined signals exist.

---

## WebSocket events reference

Your browser connects to `ws://[host]` automatically. Events you may receive:

| `type` | When | Payload fields |
|---|---|---|
| `friend.studying` | Friend opened a course | `courseTitle`, `fromName`, `fromEmoji` |
| `progress.updated` | Friend marked a module done | `moduleTitle`, `courseTitle` |
| `exam.upcoming` | Friend has an exam in ≤7 days | _(empty)_ |
| `poke.sent` | Friend poked you | `kind`, `content`, `fromName`, `fromEmoji` |
| `poke.confirmed` | Your poke was delivered | `friendName`, `friendEmoji` |

All other `type` values are silently ignored by the client.

---

## Troubleshooting

**"Invitación no válida o ya usada"** — The token was already consumed, or the
link is malformed. Generate a new invite.

**Friend accepted but I see no events** — For separate instances, each side
needs the other's server URL saved in the friend record. After accepting, edit
the friend record and fill in their server URL. They need to do the same.

**Events not arriving in real time** — Check that the WebSocket connection is
open (no console errors). The client retries automatically every 5 seconds.

**I blocked someone but they appear again** — Blocked friends are hidden from
the list but their record stays in the database (status = `blocked`). They
cannot reach you, but they still exist. This is intentional.
