# Requirements Document

## Introduction

Codeva Anonymous Chat is a WhatsApp-like anonymous messaging system embedded within the Codeva web application. Users communicate without any account registration — identity is derived entirely from a device-generated cryptographic key pair stored locally. The system supports 1-on-1 direct messages, group chats of up to 100 participants, end-to-end encryption, disappearing messages, file and voice message sharing, and onion-routed message relay for metadata privacy. Basic chat is available to all users; advanced features (E2EE, disappearing messages, file sharing, voice messages) are gated behind the Codeva MAX subscription plan.

---

## Glossary

- **Anonymous_Identity**: A locally-generated Ed25519 key pair whose public key serves as the user's pseudonymous identifier. No email, phone number, or username is required.
- **Chat_Client**: The React/Vite web frontend that hosts the anonymous chat UI.
- **Relay_Server**: The Node.js/Express backend node that forwards encrypted message packets between peers without storing message content.
- **Relay_Network**: The set of Relay_Servers that collectively provide onion-style multi-hop routing for message delivery.
- **Session**: An ephemeral, authenticated communication channel between two or more participants established via X3DH key exchange.
- **Direct_Chat**: A 1-on-1 Session between exactly two Anonymous_Identities.
- **Group_Chat**: A Session with between 2 and 100 Anonymous_Identity participants.
- **Room**: A named Group_Chat identified by a unique Room_ID.
- **Invite_Link**: A short-lived URL or deep-link token that grants a recipient the ability to join a specific Room.
- **Message_Packet**: An encrypted, authenticated unit of data representing one message, file chunk, or voice segment in transit.
- **Disappearing_Message**: A message that the Chat_Client automatically deletes from local storage after a user-configured TTL (time-to-live) expires.
- **TTL**: Time-to-live duration for Disappearing_Messages; configurable per Session.
- **E2EE**: End-to-end encryption — message content is encrypted on the sender's device and decrypted only on the recipient's device; the Relay_Server never holds plaintext.
- **MAX_Plan**: The Codeva paid subscription tier that unlocks advanced anonymous chat features.
- **Basic_Plan**: The free Codeva tier with access to unencrypted, non-disappearing 1-on-1 and group text chat.
- **Key_Bundle**: The set of public keys (identity key, signed pre-key, one-time pre-keys) published to the Relay_Server for X3DH session establishment.
- **Onion_Routing**: Multi-hop message forwarding through the Relay_Network such that no single relay knows both the sender and the recipient.
- **File_Transfer**: Transmission of binary attachments (images, documents) as encrypted chunks via the Relay_Network.
- **Voice_Message**: A recorded audio clip sent as an encrypted File_Transfer.
- **WebSocket_Connection**: The persistent WebSocket channel already in use by the Codeva daemon feature, extended to carry anonymous chat traffic.

---

## Requirements

### Requirement 1: Anonymous Identity Generation

**User Story:** As a Codeva user, I want my identity to be generated automatically from my device so that I never need to provide personal information to use the chat.

#### Acceptance Criteria

1. WHEN the Chat_Client is launched for the first time on a device, THE Chat_Client SHALL generate an Ed25519 key pair and persist it in the device's secure local storage.
2. THE Chat_Client SHALL derive the user's visible pseudonymous identifier solely from the SHA-256 hash of the public key of the Anonymous_Identity.
3. IF local storage already contains an Anonymous_Identity key pair, THEN THE Chat_Client SHALL validate the key pair before loading it; IF the stored key pair is malformed or incomplete, THEN THE Chat_Client SHALL treat it as missing and generate a new one.
4. IF the secure local storage is unavailable, corrupted, or any identity operation (including read, write, or validation) fails for any reason, THEN THE Chat_Client SHALL display an error message describing the failure and halt chat initialization.
5. THE Chat_Client SHALL NOT transmit the private key of the Anonymous_Identity to any external system.

---

### Requirement 2: Key Bundle Publication and Session Establishment

**User Story:** As a Codeva user, I want to be able to start a secure chat with another user without a server knowing the content of our conversation, so that my communications remain private.

#### Acceptance Criteria

1. WHEN an Anonymous_Identity is generated or refreshed, THE Chat_Client SHALL publish a Key_Bundle containing the identity public key, a signed pre-key, and at least 10 one-time pre-keys to the Relay_Server.
2. WHEN a Chat_Client initiates a Direct_Chat, THE Chat_Client SHALL perform an X3DH key exchange using the recipient's Key_Bundle to establish a shared Session secret.
3. WHEN a Session is established, THE Chat_Client SHALL derive message encryption keys using the Double Ratchet Algorithm seeded from the X3DH shared secret.
4. IF a recipient's one-time pre-keys are exhausted, THEN THE Chat_Client SHALL complete session establishment using only the signed pre-key and log a warning to the user that forward secrecy is reduced.
5. THE Relay_Server SHALL store Key_Bundles only in volatile memory (Redis) with a maximum TTL of 30 days, SHALL NOT persist Key_Bundles to durable storage, and SHALL employ active mechanisms to detect and prevent any attempt to write Key_Bundle data to durable storage.

---

### Requirement 3: Basic Plan — 1-on-1 Text Chat

**User Story:** As a Basic_Plan user, I want to send and receive text messages to another user directly, so that I can communicate without needing a paid subscription.

#### Acceptance Criteria

1. WHEN a Basic_Plan user opens a Direct_Chat, THE Chat_Client SHALL allow the user to send and receive text messages of up to 4,096 characters.
2. WHILE a WebSocket_Connection is active, THE Relay_Server SHALL forward each Message_Packet to the intended recipient within 500 ms of receipt under normal network conditions.
3. WHEN a recipient is offline, THE Relay_Server SHALL queue undelivered Message_Packets in Redis for up to 72 hours, after which THE Relay_Server SHALL discard undelivered packets.
4. THE Chat_Client SHALL display message delivery status as one of: Sent, Delivered, or Read.
5. WHEN a Message_Packet is delivered to the recipient device, THE Relay_Server SHALL delete the queued copy of that Message_Packet from Redis.
6. THE Basic_Plan Chat_Client SHALL NOT apply E2EE to messages; messages SHALL be encrypted in transit via TLS only.

---

### Requirement 4: Basic Plan — Group Chat

**User Story:** As a Basic_Plan user, I want to create and participate in group conversations with up to 100 people, so that I can communicate with multiple users at once without a paid plan.

#### Acceptance Criteria

1. WHEN a Basic_Plan user creates a Group_Chat, THE Chat_Client SHALL generate a unique Room_ID and register the Room with the Relay_Server.
2. THE Relay_Server SHALL enforce a maximum of 100 Anonymous_Identity participants per Room.
3. IF a user attempts to join a Room that already has 100 participants, THEN THE Relay_Server SHALL reject the join request with a capacity-exceeded error, maintaining a strict maximum of 100 total participants.
4. WHEN a participant sends a message to a Room, THE Relay_Server SHALL forward the Message_Packet to all currently connected Room members within 500 ms.
5. WHEN a participant leaves a Room, THE Chat_Client SHALL notify the Relay_Server, and THE Relay_Server SHALL remove the participant from the Room's active member list.

---

### Requirement 5: MAX Plan — End-to-End Encryption

**User Story:** As a MAX_Plan user, I want all my messages to be end-to-end encrypted so that the server and any relay node can never read my conversation content.

#### Acceptance Criteria

1. WHEN a MAX_Plan user sends a message in a Direct_Chat, THE Chat_Client SHALL encrypt the message payload using the Double Ratchet–derived key before transmission.
2. WHEN a MAX_Plan user sends a message in a Group_Chat, THE Chat_Client SHALL encrypt the message payload using the Sender Keys protocol (as per Signal's group messaging) before transmission.
3. THE Relay_Server SHALL forward Message_Packets without decrypting or inspecting the message payload.
4. WHEN an encrypted Message_Packet is received, THE Chat_Client SHALL decrypt the payload locally using the recipient's session keys before displaying the message.
5. IF decryption of a Message_Packet fails, THEN THE Chat_Client SHALL display a placeholder indicating the message could not be decrypted, preserve the current session state without discarding it, and SHALL NOT crash.
6. WHILE a MAX_Plan Session is active, THE Chat_Client SHALL ratchet the encryption key forward after every message so that compromise of one key does not expose prior messages.

---

### Requirement 6: MAX Plan — Disappearing Messages

**User Story:** As a MAX_Plan user, I want messages to automatically delete after a configurable time so that sensitive conversations do not persist indefinitely on my device.

#### Acceptance Criteria

1. WHEN a MAX_Plan user enables disappearing messages for a Session, THE Chat_Client SHALL display a TTL selector with options of: 30 seconds, 5 minutes, 1 hour, 24 hours, 7 days.
2. WHEN the TTL for a Disappearing_Message expires on the sender's device, THE Chat_Client SHALL permanently delete the message from local storage; IF deletion fails due to file system or storage errors, THEN THE Chat_Client SHALL log the error, retry deletion, and notify the user if the failure persists.
3. WHEN the TTL for a Disappearing_Message expires on the recipient's device, THE Chat_Client SHALL permanently delete the message from local storage; IF deletion fails due to file system or storage errors, THEN THE Chat_Client SHALL log the error, retry deletion, and notify the user if the failure persists.
4. THE Chat_Client SHALL display a countdown timer on each Disappearing_Message indicating the remaining TTL.
5. IF the Chat_Client is closed before a Disappearing_Message TTL expires, THEN THE Chat_Client SHALL delete the message only after the client fully initializes and is capable of performing normal operations upon a subsequent launch, even if multiple launch attempts are required before full initialization succeeds.
6. WHEN the TTL setting is changed by a Session participant, THE Chat_Client SHALL apply the new TTL only to messages sent after the change; previously sent messages SHALL retain their original TTL.
7. THE Relay_Server SHALL NOT store Disappearing_Message content beyond the queue retention window defined in Requirement 3.3; the TTL is enforced client-side only.

---

### Requirement 7: MAX Plan — File and Image Sharing

**User Story:** As a MAX_Plan user, I want to send files and images to chat participants so that I can share content securely and anonymously.

#### Acceptance Criteria

1. WHEN a MAX_Plan user attaches a file to a message, THE Chat_Client SHALL support file types including images (JPEG, PNG, GIF, WebP), documents (PDF, TXT, ZIP), and shall reject all other MIME types with a descriptive error.
2. THE Chat_Client SHALL enforce a maximum file size of 25 MB per File_Transfer.
3. IF a file exceeds 25 MB, THEN THE Chat_Client SHALL display an error message stating the size limit and SHALL NOT begin the transfer.
4. WHEN a file is sent, THE Chat_Client SHALL split the file into chunks of at most 64 KB, encrypt each chunk individually, and transmit them as sequential Message_Packets.
5. WHEN all file chunks are received, THE Chat_Client SHALL verify both the size of the reassembled file and its integrity using a SHA-256 hash included in the initial File_Transfer metadata packet; IF the reassembled file exceeds the 25 MB size limit, THE Chat_Client SHALL discard it regardless of hash validity.
6. IF the SHA-256 hash of the reassembled file does not match the expected hash, THEN THE Chat_Client SHALL discard the file and notify the user of a transfer integrity failure.
7. WHEN a Disappearing_Message TTL expires on a message that contains a File_Transfer, THE Chat_Client SHALL delete both the message and the locally stored file; THE Chat_Client SHALL also delete locally stored files when storage cleanup operations or user logout occur.

---

### Requirement 8: MAX Plan — Voice Messages

**User Story:** As a MAX_Plan user, I want to record and send voice messages so that I can communicate without typing.

#### Acceptance Criteria

1. WHEN a MAX_Plan user activates voice recording in a chat, THE Chat_Client SHALL capture audio from the device microphone at a minimum quality of 16 kHz mono PCM and encode it as an Opus audio stream.
2. THE Chat_Client SHALL enforce a maximum voice message duration of 5 minutes.
3. IF recording exceeds 5 minutes, THEN THE Chat_Client SHALL automatically stop recording and prepare the captured audio for sending.
4. WHEN a voice message is sent, THE Chat_Client SHALL transmit the audio as an encrypted File_Transfer following the same chunking and integrity verification defined in Requirement 7.
5. WHEN a voice message is received and decrypted, THE Chat_Client SHALL display an inline audio player with play, pause, and seek controls; audio player controls SHALL be available in the UI before any voice message is received.
6. IF microphone permission is denied by the operating system, THEN THE Chat_Client SHALL display an error message explaining that microphone access is required for voice messages when the user attempts to start recording.

---

### Requirement 9: Onion Routing via Relay Network

**User Story:** As a Codeva user, I want my messages to be routed through multiple relay nodes so that no single server can correlate my identity with my communication partner.

#### Acceptance Criteria

1. WHEN a MAX_Plan user sends a message, THE Chat_Client SHALL route the Message_Packet through at least 3 Relay_Server hops before delivery to the recipient.
2. THE Chat_Client SHALL encrypt each routing layer independently so that a given Relay_Server can only decrypt its own routing header and not the full path or payload.
3. THE Relay_Server SHALL forward a Message_Packet to the next hop specified in the decrypted routing header without logging the association between the incoming and outgoing connection.
4. IF a relay hop is unreachable, THEN THE Chat_Client SHALL attempt an alternate route within the Relay_Network before reporting a delivery failure to the user.
5. THE Relay_Server SHALL NOT log any combination of source IP addresses, message content, or routing metadata that could enable correlation of sender and recipient identity.
6. WHILE a Basic_Plan user sends a message, THE Chat_Client SHALL route Message_Packets through a single Relay_Server hop using standard TLS without multi-hop onion routing.

---

### Requirement 10: Room Invite Links

**User Story:** As a Codeva user, I want to generate invite links to share with people so that they can join my group chat without needing to know my identity.

#### Acceptance Criteria

1. WHEN a Room participant requests an Invite_Link, THE Chat_Client SHALL generate a cryptographically signed token containing the Room_ID, a creation timestamp, and an expiry duration.
2. THE Chat_Client SHALL support Invite_Link expiry durations of: 1 hour, 24 hours, 7 days, and never-expire.
3. WHEN a recipient opens a valid Invite_Link, THE Chat_Client SHALL validate the link first; IF the link is valid, THE Chat_Client SHALL resolve the Room and initiate the join flow without requiring the recipient to disclose personal information.
4. IF an Invite_Link has expired or been revoked, THEN THE Relay_Server SHALL immediately reject the join request with an invalid-or-expired-link error without resolving the Room or initiating any join flow.
5. WHEN a Room admin revokes an Invite_Link, THE Relay_Server SHALL immediately invalidate the corresponding token and refuse subsequent join attempts using that token.
6. IF an Invite_Link would cause the Room membership to exceed 100 participants, THEN THE Relay_Server SHALL reject the join request with a capacity-exceeded error.

---

### Requirement 11: Plan Enforcement and Feature Gating

**User Story:** As a Codeva platform operator, I want advanced chat features to be accessible only to MAX_Plan subscribers so that the monetization model is enforced consistently.

#### Acceptance Criteria

1. WHEN a Basic_Plan user attempts to enable E2EE, disappearing messages, file sharing, or voice messages, THE Chat_Client SHALL display an upgrade prompt directing the user to the MAX_Plan subscription page.
2. THE Relay_Server SHALL verify the requesting user's plan tier before processing any MAX-plan-only operation, using the existing Codeva authentication token passed over the WebSocket_Connection.
3. IF a MAX_Plan subscription lapses, THEN THE Chat_Client SHALL disable advanced features at the next session launch and notify the user that their subscription has ended.
4. WHEN a MAX_Plan user's session is active, THE Relay_Server SHALL not downgrade feature access until the current WebSocket_Connection is closed, except in the case of payment failure or account suspension due to policy violations, in which case THE Relay_Server SHALL immediately downgrade feature access regardless of session state.
5. THE Chat_Client SHALL display clear visual indicators distinguishing E2EE-protected messages from unencrypted Basic_Plan messages within the same conversation view.

---

### Requirement 12: WebSocket Integration with Existing Infrastructure

**User Story:** As a Codeva developer, I want the anonymous chat system to reuse the existing WebSocket infrastructure so that I do not need to build a separate real-time transport layer.

#### Acceptance Criteria

1. THE Chat_Client SHALL multiplex anonymous chat Message_Packets over the existing WebSocket_Connection used by the Codeva daemon feature using a dedicated message-type namespace.
2. WHEN the WebSocket_Connection is interrupted, THE Chat_Client SHALL attempt reconnection with exponential backoff starting at 1 second, doubling up to a maximum of 32 seconds.
3. WHILE the WebSocket_Connection is unavailable, THE Chat_Client SHALL queue outgoing messages locally and transmit them upon reconnection.
4. THE Relay_Server SHALL handle anonymous chat WebSocket events without interfering with existing daemon WebSocket event handling.
5. WHEN the web application loads in the browser, THE Chat_Client SHALL reuse the active WebSocket_Connection if one already exists for the daemon feature rather than opening a new connection.

---

### Requirement 13: No Server-Side Message Persistence

**User Story:** As a Codeva user, I want assurance that the server never permanently stores my message content so that my conversations cannot be retrieved from server infrastructure.

#### Acceptance Criteria

1. THE Relay_Server SHALL NOT write message payload content to any persistent database, including MongoDB.
2. THE Relay_Server SHALL store undelivered Message_Packets only in Redis with the retention policy defined in Requirement 3.3.
3. WHEN a Message_Packet is successfully delivered, THE Relay_Server SHALL delete the queued packet from Redis immediately.
4. THE Relay_Server SHALL store only the following non-content metadata in MongoDB: Room_ID, participant count, Room creation timestamp, and Invite_Link tokens; IF MongoDB is unavailable, THE Relay_Server SHALL fail the metadata operation and not store metadata in an alternative location.
5. IF a system audit or compliance check requires logging, THE Relay_Server SHALL log only anonymized event types (e.g., "message_forwarded") without message content, sender identity, or routing path.

---

### Requirement 14: Identity Portability and Key Backup (Optional Feature)

**User Story:** As a MAX_Plan user, I want to export my anonymous identity key so that I can restore my identity on a new device without losing access to my chats.

#### Acceptance Criteria

1. WHERE key export is initiated by the user, THE Chat_Client SHALL export the Anonymous_Identity private key as an AES-256-GCM encrypted backup file, protected by a user-supplied passphrase.
2. WHERE a key backup file is imported, THE Chat_Client SHALL decrypt the backup using the supplied passphrase and restore the Anonymous_Identity key pair to local secure storage.
3. IF the passphrase supplied during import is incorrect, THEN THE Chat_Client SHALL return a decryption-failed error and SHALL NOT overwrite the existing Anonymous_Identity; IF the backup file is corrupted or tampered with, THEN THE Chat_Client SHALL return a file-integrity error and SHALL NOT overwrite the existing Anonymous_Identity.
4. WHERE key export is used, THE Chat_Client SHALL display a warning informing the user that sharing the backup file compromises their anonymous identity.
5. WHERE a key backup file would overwrite an existing Anonymous_Identity upon import, THE Chat_Client SHALL require explicit user confirmation before proceeding, even when the supplied passphrase is correct and the backup file is valid.
