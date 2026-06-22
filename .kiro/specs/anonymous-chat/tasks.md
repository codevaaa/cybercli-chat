# Implementation Plan: Codeva Anonymous Chat

## Overview

Implementation of the Codeva Anonymous Chat feature across 14 task groups covering identity management, cryptography, transport, media, relay server extensions, plan enforcement, and test suites. Tasks are ordered so that foundational crypto and transport layers are built first, then feature layers, then integration and smoke tests.

## Tasks

- [x] 1. Identity Manager — Core Key Generation and Storage
  - Define `AnonymousIdentity` and `StoredIdentity` TypeScript interfaces
  - Implement `generateIdentity()` using `@noble/curves` Ed25519 key generation
  - Implement `deriveIdentifier(publicKey)` as lowercase hex of SHA-256 of raw public key bytes
  - Implement `persistIdentity(identity)` using IndexedDB with private key encrypted at rest via `SubtleCrypto` AES-GCM (browser-native, no extra dependency)
  - Implement `loadIdentity()` with full validation: verify key pair is structurally complete and Ed25519-valid before returning; treat malformed or incomplete as missing and generate a new one
  - Implement error path: if any identity operation (read, write, or validate) fails for any reason, surface a typed `IDENTITY_INIT_FAILED` error and halt chat initialization
  - Implement `initialize()` orchestrating the load-or-generate flow
  - Write unit tests: first launch generates key, second launch returns same key, malformed storage triggers regeneration
  - Write PBT — Property 1 (Identity Derivation is Deterministic): `fc.uint8Array({ minLength: 32, maxLength: 32 })` → `deriveIdentifier` returns identical hex on every call and equals `sha256Hex(pubKey)`
  - Write PBT — Property 2 (Identity Initialization is Idempotent): two consecutive `initialize()` calls return the same identifier
  - **Files:** `src/chat/identity/IdentityManager.ts`, `src/chat/identity/IdentityManager.test.ts`
  - **Requirement refs:** REQ-1.1, REQ-1.2, REQ-1.3, REQ-1.4, REQ-1.5

- [x] 2. Key Bundle Manager — X3DH Pre-Key Infrastructure
  - Define `KeyBundle` TypeScript interface (identity key, signed pre-key with signature, one-time pre-keys array)
  - Implement `generateBundle(identity)`: generate 1 signed pre-key (X25519) + 10 one-time pre-keys (X25519); sign pre-key with Ed25519 identity key
  - Implement `publishBundle(bundle)` sending bundle to Relay Server over WS frame `anon_chat.key_bundle_pub`; store only in Redis (never in MongoDB or durable storage)
  - Implement `fetchBundle(recipientId)` sending `anon_chat.key_bundle_req` and awaiting response
  - Implement `replenishOneTimePreKeys()` triggered when local OTK count drops below 5
  - Implement OTK-exhausted fallback: complete session with signed pre-key only and emit a user-visible `OTK_EXHAUSTED` warning
  - Write unit tests: bundle contains ≥10 OTKs, signed pre-key signature verifies against identity key, OTK exhausted warning fires
  - Write PBT — Property 3 (Key Bundle Structural Validity): generated bundle always has valid signature and ≥10 OTKs for any key pair
  - **Files:** `src/chat/crypto/KeyBundleManager.ts`, `src/chat/crypto/KeyBundleManager.test.ts`
  - **Requirement refs:** REQ-2.1, REQ-2.4, REQ-2.5
  - **Depends on:** Task 1

- [x] 3. Crypto Engine — X3DH, Double Ratchet, and Sender Keys
  - Implement X3DH initiator path `initiateSession(myIdentity, recipientBundle)` using `@noble/curves` X25519 DH operations
  - Implement X3DH responder path `receiveSession(myIdentity, initialMessage)`
  - Implement `initRatchet(secret)` seeding Double Ratchet state from X3DH shared secret
  - Implement `encryptMessage(state, plaintext)` advancing ratchet and returning AES-GCM ciphertext + header
  - Implement `decryptMessage(state, header, ciphertext)`: on failure return typed `DecryptionError`, preserve ratchet state, never throw unhandled exception
  - Implement Sender Keys protocol: `generateSenderKey()`, `encryptGroupMessage()`, `decryptGroupMessage()` per Signal group messaging spec
  - Write unit tests: decryption failure returns error type (not throw), session state unchanged after failed decryption
  - [x] 3.1 Write PBT — Property 4 (X3DH Shared Secret Symmetry): Alice and Bob running X3DH produce identical shared secrets
  - [x] 3.2 Write PBT — Property 5 (Double Ratchet Key Uniqueness): n≥2 consecutive `nextMessageKey()` calls all produce distinct keys
  - [x] 3.3 Write PBT — Property 6 (E2EE Round-Trip): `decrypt(encrypt(x)) === x` and `ciphertext !== plaintext`
  - [x] 3.4 Write PBT — Property 7 (Decryption Failure is Non-Crashing): arbitrary or corrupted bytes passed to `decryptMessage` always return `DecryptionError`, never throw
  - **Files:** `src/chat/crypto/CryptoEngine.ts`, `src/chat/crypto/CryptoEngine.test.ts`
  - **Requirement refs:** REQ-2.2, REQ-2.3, REQ-5.1, REQ-5.2, REQ-5.5, REQ-5.6
  - **Depends on:** Task 2

- [x] 4. WebSocket Multiplexer — Namespace and Reconnect
  - Define `ChatFrame` interface with `type: \`anon_chat.${string}\`` discriminated union
  - Implement frame dispatch: outgoing chat frames tagged with `anon_chat.*` prefix, incoming frames demuxed by type prefix without touching daemon frames
  - Implement exponential backoff reconnect: delays `[1, 2, 4, 8, 16, 32, 32, …]` seconds; notify user after 10 consecutive failures
  - Implement offline queue: buffer outgoing messages locally while WS is unavailable, flush in original order on reconnect
  - Implement browser WS reuse: on page load, check for an existing daemon WS connection and attach to it rather than open a new socket
  - Write unit tests: backoff sequence `[1000, 2000, 4000, 8000, 16000, 32000, 32000]`, offline queue flushes in order after reconnect, `anon_chat.*` frames never interfere with daemon frames
  - Write PBT — Property 31 (WS Namespace Invariant): every emitted chat frame type matches `/^anon_chat\.[a-z_]+$/`
  - Write PBT — Property 32 (Exponential Backoff Sequence): `computeBackoffDelay(n) === min(2^(n-1) * 1000, 32000)` for all n 1–20
  - Write PBT — Property 33 (Offline Queue Completeness): messages sent offline flush in original order after reconnect with none dropped
  - **Files:** `src/chat/transport/WsMultiplexer.ts`, `src/chat/transport/WsMultiplexer.test.ts`
  - **Requirement refs:** REQ-12.1, REQ-12.2, REQ-12.3, REQ-12.4, REQ-12.5

- [x] 5. Onion Router — Layered Encryption and Route Selection
  - Define `RelayHop` and `OnionPacket` TypeScript interfaces
  - Implement `buildPacket(hops, payload)`: layer Curve25519 ECDH + AES-GCM for each hop; use fixed 1300-byte `routingInfo` padding
  - Implement `peelLayer(myPrivateKey, packet)`: decrypt one routing header, reveal next hop address and inner packet only — no subsequent hops or payload exposed
  - Implement `selectRoute(excludedNodes?)`: select 3 relay nodes from the `relay:nodes` registry, excluding provided node IDs for retry
  - Implement single-hop path for Basic plan (no onion wrapping, plain TLS WebSocket)
  - Write unit tests: 3-hop packet built successfully, peeling layer 1 reveals only hop 2 address, alternate route selected when node excluded
  - Write PBT — Property 22 (MAX Plan Minimum Hops): `selectRoute()` always returns ≥3 hops for MAX plan
  - Write PBT — Property 23 (Onion Layers Reveal Only Next Hop): peeling layer n reveals only hop n+1, not n+2 or payload
  - Write PBT — Property 24 (Alternate Route on Hop Failure): `selectRoute(excluded)` never returns a route containing any excluded node
  - Write PBT — Property 25 (Basic Plan Single Hop): Basic plan route always has exactly 1 hop with no onion structure
  - **Files:** `src/chat/transport/OnionRouter.ts`, `src/chat/transport/OnionRouter.test.ts`
  - **Requirement refs:** REQ-9.1, REQ-9.2, REQ-9.3, REQ-9.4, REQ-9.5, REQ-9.6
  - **Depends on:** Task 4

- [x] 6. File and Voice Engine — Chunking, Integrity, and Opus Recording
  - Implement `validateFile(file)`: check MIME type against allowlist (JPEG, PNG, GIF, WebP, PDF, TXT, ZIP); reject all others with `MIME_TYPE_REJECTED`; enforce 25 MB limit with `FILE_TOO_LARGE`
  - Implement `chunkAndEncrypt(file, sessionKey)`: split into ≤64 KB plaintext chunks, encrypt each with AES-GCM, yield as async generator
  - Implement `reassembleAndDecrypt(chunks, sessionKey, meta)`: reassemble, verify SHA-256 against metadata hash, verify reassembled size ≤25 MB (discard even with valid hash if oversized), surface `INTEGRITY_CHECK_FAILED` on mismatch
  - Implement `verifyIntegrity(data, expectedHash)` as a standalone helper
  - Implement `deleteLocalFile(path)` used by TTL expiry, storage cleanup, and user logout flows
  - Implement `startRecording()` / `stopRecording()` using `opus-recorder` (WebAssembly libopus) at ≥16 kHz mono PCM encoded as Ogg/Opus blob; auto-stop at 300 seconds
  - Implement microphone permission gate: show `MIC_PERMISSION_DENIED` error only when user attempts to start recording with denied permissions
  - Implement inline audio player component with play, pause, and seek controls available in the UI before any voice message is received
  - Write unit tests: MIME type allowlist, 25 MB boundary (25 MB−1 accepted, 25 MB+1 rejected), chunk ≤64 KB, integrity failure discards file, recording auto-stops at 5 min, mic permission error shown at attempt time
  - [x] 6.1 Write PBT — Property 16 (MIME Validation Completeness): arbitrary MIME strings accepted if and only if in allowlist
  - [x] 6.2 Write PBT — Property 17 (File Size Validation): sizes ≤26,214,400 bytes accepted, sizes above rejected
  - [x] 6.3 Write PBT — Property 18 (Chunk Size Invariant): every chunk from `chunkAndEncrypt` has plaintext ≤65,536 bytes
  - [x] 6.4 Write PBT — Property 19 (File Integrity Round-Trip): SHA-256 of reassembled file equals SHA-256 of original; corrupted chunk triggers failure
  - [x] 6.5 Write PBT — Property 20 (Disappearing File Deletion): after TTL elapsed both message record and file path are absent from storage
  - [x] 6.6 Write PBT — Property 21 (Voice Recording Duration Enforcement): recording auto-stops at or before 300 seconds for any duration input
  - **Files:** `src/chat/media/FileEngine.ts`, `src/chat/media/VoiceRecorder.ts`, `src/chat/media/AudioPlayer.tsx`, `src/chat/media/FileEngine.test.ts`
  - **Requirement refs:** REQ-7.1, REQ-7.2, REQ-7.3, REQ-7.4, REQ-7.5, REQ-7.6, REQ-7.7, REQ-8.1, REQ-8.2, REQ-8.3, REQ-8.4, REQ-8.5, REQ-8.6
  - **Depends on:** Task 3

- [x] 7. Relay Server — WebSocket Handler, Plan Guard, and Room Registry
  - Implement `chatWsHandler.ts`: dispatch `anon_chat.*` frames to sub-handlers without touching existing daemon event handlers
  - Implement `planGuard.ts` middleware: extract Codeva auth token from WS connection, verify plan tier via existing auth service, return 403 for MAX-only operations on non-MAX tokens; allow immediate downgrade for payment failure or account suspension
  - Implement `roomRegistry.ts`: create Room (generate UUID Room_ID, store in MongoDB `chat_rooms`), enforce 100-participant cap atomically in Redis (`SCARD` before `SADD`), manage join/leave membership in Redis Set
  - Implement message queue handlers: queue undelivered packets in Redis with 72h TTL, delete from Redis on delivery ACK receipt
  - Implement relay logging: log only anonymized event type labels — no payload, sender ID, IP, or routing path in any log record
  - Write unit tests: 100-participant cap (101st join rejected), plan guard 403 on free-plan MAX request, delivery ACK triggers Redis deletion, daemon frames unaffected by chat handler
  - Write PBT — Property 11 (Room Capacity Invariant): adding up to 150 participants never results in more than 100 in the room
  - Write PBT — Property 12 (Room Membership Removal): after `leaveRoom(id)`, identifier is absent from member set
  - Write PBT — Property 13 (Post-Delivery Redis Cleanup): every ACK'd packet ID returns null on Redis lookup
  - Write PBT — Property 29 (Server Feature Gate): non-MAX auth token always receives 403 for MAX-only operations
  - Write PBT — Property 30 (Log Entries Contain No Sensitive Data): log records contain none of payload, sender ID, IP, or routing path
  - **Files:** `backend/src/chat/chatWsHandler.ts`, `backend/src/chat/planGuard.ts`, `backend/src/chat/roomRegistry.ts`
  - **Requirement refs:** REQ-3.2, REQ-3.3, REQ-3.5, REQ-4.1, REQ-4.2, REQ-4.3, REQ-4.5, REQ-11.2, REQ-11.4, REQ-12.4, REQ-13.1, REQ-13.2, REQ-13.3, REQ-13.5
  - **Depends on:** Task 4

- [x] 8. Relay Handler and Key Bundle Server Storage
  - Implement `relayHandler.ts`: peel one onion layer, forward inner packet to next-hop address from decoded routing header; never log incoming/outgoing connection association
  - Implement Key Bundle Redis storage with 30-day TTL; add an explicit guard that intercepts any attempt to write key bundle data to MongoDB and throws a hard error
  - Implement MongoDB availability guard for metadata operations: if MongoDB is unavailable, fail the operation and return an error — do not fall back to Redis or any alternative store
  - Write unit tests: relay handler forwards to correct next hop, key bundle write to MongoDB throws, MongoDB unavailability causes metadata op failure without silent fallback
  - Write smoke test: assert no key bundle data appears in any MongoDB collection after a publish cycle
  - **Files:** `backend/src/chat/relayHandler.ts`, `backend/src/chat/keyBundleStore.ts`
  - **Requirement refs:** REQ-2.5, REQ-9.3, REQ-9.5, REQ-13.4
  - **Depends on:** Task 7

- [x] 9. Disappearing Messages — TTL Enforcement and Countdown UI
  - Implement TTL selector UI component with exactly 5 options: 30 seconds, 5 minutes, 1 hour, 24 hours, 7 days
  - Implement `DisappearingMessageScheduler`: schedule deletion for each message's `disappearsAt` timestamp using a persistent timer that survives background or minimize
  - Implement deletion with error handling: on failure, log error, retry up to 3 times with backoff, notify user if all retries fail
  - Implement post-launch cleanup: on `initialize()` completing successfully, scan local message store for messages past their `disappearsAt` and delete them; skip if initialization is not fully complete
  - Implement TTL change semantics: applying a new TTL updates session config only; existing messages retain their original `disappearsAt` values
  - Implement countdown timer display component: renders remaining time on each disappearing message bubble
  - Write unit tests: TTL selector renders exactly 5 options, TTL change does not alter existing message `disappearsAt`, post-launch cleanup runs after full init, deletion retry fires on failure
  - Write PBT — Property 14 (Disappearing Message TTL Deletion): messages with elapsed `disappearsAt` are not retrievable from local storage
  - Write PBT — Property 15 (TTL Change Does Not Affect Existing Messages): changing TTL leaves all pre-existing `disappearsAt` values unchanged
  - **Files:** `src/chat/features/DisappearingMessageScheduler.ts`, `src/chat/components/TtlSelector.tsx`, `src/chat/components/CountdownTimer.tsx`, `src/chat/features/DisappearingMessage.test.ts`
  - **Requirement refs:** REQ-6.1, REQ-6.2, REQ-6.3, REQ-6.4, REQ-6.5, REQ-6.6, REQ-6.7
  - **Depends on:** Task 1

- [x] 10. Room Invite Links — Token Generation and Validation
  - Implement `createInviteLink(roomId, expiry)`: generate HMAC-SHA256 signed token containing Room_ID, creation timestamp, and expiry duration; store in Redis with matching TTL
  - Support expiry options: 1 hour, 24 hours, 7 days, and never-expire (null TTL in Redis)
  - Implement `validateInviteLink(token)`: verify HMAC signature, check `expiresAt`, check `revokedAt`; return `INVITE_INVALID` immediately without resolving Room or initiating join if invalid, expired, or revoked
  - Implement `revokeInviteLink(token)`: set `revokedAt` in Redis immediately; all subsequent validation calls for that token return `INVITE_INVALID`
  - Enforce capacity check during invite join: if `room:members` SCARD ≥ 100, reject with `ROOM_AT_CAPACITY` before admitting
  - Implement client-side invite flow: open link → validate first → if valid, resolve Room and show join UI; if invalid or expired, show error modal without resolving Room
  - Write unit tests: expired token rejected without room resolve, revoked token immediately invalid, never-expire token passes at future timestamp, 101st join via invite rejected
  - [x] 10.1 Write PBT — Property 26 (Invite Token Round-Trip): `parse(create(roomId, expiry)).roomId === roomId` for all valid inputs — ✅ passed (100 runs)
  - [x] 10.2 Write PBT — Property 27 (Expired and Revoked Links Rejected): expired or revoked tokens always return `invalid`, never `valid` — ✅ passed (100 runs)
  - **Files:** `backend/src/chat/inviteService.ts`, `src/chat/features/InviteLink.ts`, `backend/src/chat/inviteService.test.ts`
  - **Requirement refs:** REQ-10.1, REQ-10.2, REQ-10.3, REQ-10.4, REQ-10.5, REQ-10.6
  - **Depends on:** Task 7

- [x] 11. Plan Enforcement — Feature Gating UI and E2EE Indicators
  - Implement `planGuard` client hook: wrap advanced feature entry points (enableE2EE, enableDisappearing, sendFile, sendVoice) with plan check; return `PLAN_UPGRADE_REQUIRED` and show upgrade modal for Basic plan users
  - Implement upgrade modal component: displays feature name and links to MAX plan subscription page
  - Implement plan lapse handling in `initialize()`: detect plan changed to non-MAX, disable advanced features, display subscription-ended notification
  - Implement E2EE badge UI: show lock icon on E2EE-encrypted messages, absent on TLS-only Basic plan messages, within the same conversation view
  - Write unit tests: upgrade modal renders for each of the 4 gated features, E2EE badge present on encrypted messages and absent on TLS-only, plan lapse disables features on next init
  - Write PBT — Property 28 (Client Feature Gate): calling any advanced function with `plan = 'free'` always returns `UpgradePlanError` and never executes the operation
  - **Files:** `src/chat/hooks/usePlanGuard.ts`, `src/chat/components/UpgradeModal.tsx`, `src/chat/components/E2eeBadge.tsx`, `src/chat/hooks/usePlanGuard.test.ts`
  - **Requirement refs:** REQ-11.1, REQ-11.3, REQ-11.5
  - **Depends on:** Task 1

- [x] 12. Basic Plan Chat — Message Validation and Delivery Status
  - Implement `validateMessageLength(text)`: accept if and only if `text.length ≤ 4096`; reject with inline error
  - Implement delivery status FSM: valid transitions only — `sent → delivered → read`; display as three distinct visual states in message bubble
  - Implement Basic plan message path: send without E2EE wrapper, confirm TLS-only transport flag set in `ChatFrame`
  - Implement Group_Chat creation: generate UUID Room_ID, register Room via `anon_chat.room_join` WS frame
  - Write unit tests: message at exactly 4096 chars accepted, 4097 chars rejected, delivery status only transitions through valid states, group room creation returns valid UUID Room_ID
  - Write PBT — Property 8 (Message Length Validation): strings ≤4096 chars accepted, strings >4096 rejected
  - Write PBT — Property 9 (Delivery Status Always Valid): delivery status after any lifecycle transition is always one of `sent|delivered|read`
  - Write PBT — Property 10 (Basic Plan Messages Not E2EE): messages with `plan='free'` never have E2EE encryption header
  - **Files:** `src/chat/features/MessageComposer.ts`, `src/chat/features/DeliveryStatus.ts`, `src/chat/features/BasicChat.test.ts`
  - **Requirement refs:** REQ-3.1, REQ-3.4, REQ-3.6, REQ-4.1, REQ-4.4
  - **Depends on:** Task 4

- [x] 13. Identity Key Backup and Restore
  - Implement `exportEncrypted(passphrase)` in `IdentityManager`: derive AES-256-GCM key from passphrase via PBKDF2 (100,000 iterations, SHA-256), encrypt private key, return encrypted backup blob
  - Implement `importEncrypted(data, passphrase)`: decrypt backup; on wrong passphrase return `KEY_BACKUP_WRONG_PASSPHRASE` without touching existing identity; on corrupted or tampered file return `KEY_BACKUP_INTEGRITY_ERROR` without touching existing identity
  - Implement overwrite confirmation: if an identity already exists, require explicit user confirmation modal before proceeding, even when passphrase is correct and file is valid
  - Implement export warning modal: displayed when export is initiated, informing user that sharing the backup compromises their anonymous identity
  - Write unit tests: export then import with correct passphrase restores identical key pair, wrong passphrase returns error and leaves existing identity unchanged, corrupted file returns integrity error, overwrite confirmation required even with valid passphrase
  - [x] 13.1 Write PBT — Property 34 (Key Backup Passphrase Round-Trip): `import(export(identity, p), p)` restores byte-for-byte identical key pair for any passphrase string
  - [x] 13.2 Write PBT — Property 35 (Wrong Passphrase Does Not Overwrite): any wrong passphrase leaves existing stored identity unchanged
  - **Files:** `src/chat/identity/IdentityManager.ts` (extended), `src/chat/components/KeyBackupModal.tsx`, `src/chat/identity/KeyBackup.test.ts`
  - **Requirement refs:** REQ-14.1, REQ-14.2, REQ-14.3, REQ-14.4, REQ-14.5
  - **Depends on:** Task 1

- [x] 14. Integration Tests and Smoke Tests
  - Integration test: Key_Bundle publish → fetch lifecycle (publish to mock relay, fetch returns same bundle, bundle not in MongoDB)
  - Integration test: offline recipient message queuing — queue in Redis with 72h TTL, verify TTL set, verify Redis cleanup on delivery ACK
  - Integration test: MongoDB `chat_rooms` document structure contains only `roomId`, `participantCount`, `createdAt`, `createdByHash` with no payload, content, or message fields
  - Integration test: plan guard end-to-end — free-plan WS token receives 403 on MAX-only operation
  - Integration test: WebSocket multiplexing — interleaved `anon_chat.*` and daemon frames processed independently without interference
  - Integration test: room join/leave — participant count in Redis increments and decrements correctly, 100-participant cap enforced
  - Smoke test: no private key material in any outbound HTTP or WS frame (mock network intercept)
  - Smoke test: MongoDB `chat_rooms` collection has no `content`, `payload`, or `message` fields after a full message-send cycle
  - Smoke test: relay server log output for a full message cycle contains none of `userId`, `senderId`, `routingPath`, or message content
  - **Files:** `backend/src/chat/tests/integration.test.ts`, `backend/src/chat/tests/smoke.test.ts`
  - **Requirement refs:** All
  - **Depends on:** Task 7, Task 8, Task 10

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1", "4"] },
    { "wave": 2, "tasks": ["2", "5", "7", "9", "11", "12", "13"] },
    { "wave": 3, "tasks": ["3", "8", "10"] },
    { "wave": 4, "tasks": ["6"] },
    { "wave": 5, "tasks": ["14"] }
  ]
}
```

## Notes

- All cryptographic primitives use `@noble/curves` and `@noble/hashes` — audited, zero-dependency TypeScript libraries. No WebCrypto polyfill needed for Ed25519/X25519.
- Voice recording uses `opus-recorder` (WebAssembly libopus). Confirm WASM loading works correctly in the Vite web build before Task 6.
- The Relay Server modules are plain TypeScript ES modules appended to the existing Express app. They must not alter any existing route, middleware, or WebSocket handler.
- Tasks 1–6 are entirely client-side and can be developed and tested independently of the backend.
- Tasks 7–8 require a running Redis instance and MongoDB for integration testing; use `ioredis-mock` and `mongodb-memory-server` in unit/integration tests to avoid environment dependencies.
- All PBT tests run a minimum of 100 iterations using `fast-check`. Tag each test with `// Feature: anonymous-chat, Property N: <description>` for traceability.
- Requirement 14 (Key Backup) is the only optional feature in the spec; Task 13 can be deferred without blocking any other task.
