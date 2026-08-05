# Google Sheets Synchronization Roadmap

## Architectural recap

Lootrack remains a **local-first application**.

```text
Angular / NgRx
      ↓
Dexie / IndexedDB
      ↓
Local ordered outbox
      ↓
Synchronization engine
      ↓
Google Sheets mutation log
```

Core rules:

* IndexedDB is the live application database.
* Google Sheets stores a shared, ordered mutation log.
* Every local change updates the entity and adds an outbox mutation atomically.
* Mutations are immutable and ordered through a local incremental sequence.
* A complete local batch is uploaded to Google Sheets atomically.
* Remote mutations are replayed in log order.
* Remote changes are applied through a dedicated sync layer, not through normal repositories.
* Timestamps are informational and must not silently decide conflicts.
* Concurrent edits are detected by comparing the version on which a local mutation was based with the latest remote version.
* Deletes remain tombstones until eventual compaction.

---

# Milestone A — Local ordered outbox

## Synchronization models

* [x] Create a shared synchronization metadata interface.

```ts
interface SyncMetadata {
  revision: number;
  lastMutationId: string;
}
```

* [x] Add synchronization metadata to `Transaction`.

* [x] Add synchronization metadata to `Category`.

* [x] Decide whether app settings should be synchronized.

* [x] Keep device-specific settings local where appropriate.

synchronized settings:

* [x] Currency

---

## Mutation model

* [x] Create the synchronized entity type.

```ts
type SyncEntityType =
  | "transaction"
  | "category"
  | "settings";
```

* [x] Create the synchronization operation type.

```ts
type SyncOperation = "upsert" | "delete";
```

* [x] Create the ordered outbox mutation model.

```ts
interface OutboxMutation {
  localSequence?: number;
  mutationId: string;

  entityType: SyncEntityType;
  entityId: string;
  operation: SyncOperation;

  baseRevision: number | null;
  baseMutationId: string | null;

  payloadJson: string;
  createdAt: string;
}
```

---

## Dexie schema

* [x] Add the mutations table.

```ts
mutations!: EntityTable<OutboxMutation, "localSequence">;
```

* [x] Configure the mutations store.

```ts
mutations:
  "++localSequence, &mutationId, entityType, entityId, createdAt"
```

* [ ] Add a synchronization connection table.

```ts
interface SyncConnection {
  id: "google-sheets";
  spreadsheetId: string;
  datasetId: string;
  deviceId: string;
  remoteCursor: number;
  lastSyncAt: string | null;
}
```

* [ ] Add the `syncConnections` store.

* [ ] Add an applied-mutations table.

```ts
interface AppliedMutation {
  mutationId: string;
  appliedAt: string;
}
```

* [ ] Add the `appliedMutations` store.

* [ ] Add a conflicts table.

```ts
interface SyncConflict {
  id: string;
  entityType: SyncEntityType;
  entityId: string;

  basePayloadJson: string;
  localPayloadJson: string;
  remotePayloadJson: string;

  detectedAt: string;
  status: "pending" | "resolved";
}
```

* [ ] Add the `syncConflicts` store.

---

## Mutation factory

* [ ] Create a central mutation factory.

```ts
function createMutation<T extends SyncMetadata>(
  entityType: SyncEntityType,
  operation: SyncOperation,
  previousEntity: T | null,
  nextEntity: Omit<T, keyof SyncMetadata>,
  timestamp: string,
): {
  entity: T;
  mutation: OutboxMutation;
}
```

* [ ] Generate one `mutationId` per mutation.

* [ ] Store the previous `revision` as `baseRevision`.

* [ ] Store the previous `lastMutationId` as `baseMutationId`.

* [ ] Increment the entity revision.

* [ ] Set the entity `lastMutationId` to the new mutation ID.

* [ ] Serialize the final entity into `payloadJson`.

* [ ] Use the same timestamp for the entity and its mutation.

* [ ] Rename the existing generic `SyncMutation` type to `OutboxMutation` or `SyncMutation`.

---

## Transaction repository integration

* [ ] Update transaction creation.

Inside one Dexie transaction:

* [ ] Generate the mutation ID.

* [ ] Create the transaction with revision `1`.

* [ ] Set `lastMutationId`.

* [ ] Save the transaction.

* [ ] Add the outbox mutation.

* [ ] Update transaction editing.

Inside one Dexie transaction:

* [ ] Read the existing transaction.

* [ ] Save its current revision as the mutation base.

* [ ] Save its current `lastMutationId` as the mutation base ID.

* [ ] Increment the revision.

* [ ] Update the transaction fields.

* [ ] Save the transaction.

* [ ] Add the mutation.

* [ ] Update transaction deletion.

Inside one Dexie transaction:

* [ ] Read the current transaction.
* [ ] Create a complete tombstone.
* [ ] Set `deletedAt`.
* [ ] Increment the revision.
* [ ] Update `lastMutationId`.
* [ ] Save the tombstone.
* [ ] Add a delete mutation containing the tombstone payload.

---

## Category repository integration

* [ ] Update category creation.

* [ ] Update category editing.

* [ ] Update category deletion.

* [ ] Ensure category deletion serializes the updated tombstone, not the old entity.

* [ ] Add `lootrackDb.mutations` to every Dexie transaction that writes mutations.

* [ ] Generate transaction mutations when category creation assigns existing transactions.

* [ ] Generate transaction mutations when category editing assigns existing transactions.

* [ ] Preserve the exact order in which related mutations are added.

Example:

```text
1. Category created
2. Transaction assigned to category
3. Another transaction assigned to category
```

* [ ] Commit the category, affected transactions, and all mutations atomically.

---

## Mutations repository

* [ ] Rename `getAll()` to `getPending()`.

* [ ] Return `OutboxMutation[]`, never `null`.

```ts
getPending(): Observable<OutboxMutation[]>
```

* [ ] Read mutations ordered by `localSequence`.

```ts
lootrackDb.mutations
  .orderBy("localSequence")
  .toArray();
```

* [ ] Add batch retrieval.

```ts
getPendingBatch(limit: number)
```

* [ ] Add acknowledgement deletion by mutation ID.

```ts
removeAcknowledged(mutationIds: readonly string[])
```

* [ ] Ensure acknowledgement removes only the mutations included in the uploaded snapshot.

* [ ] Do not clear the entire outbox after sync.

* [ ] Preserve mutations created while synchronization is already running.

---

## Local tests

* [ ] Test transaction creation plus mutation creation.

* [ ] Test transaction update plus mutation creation.

* [ ] Test transaction deletion plus mutation creation.

* [ ] Test category creation plus mutation creation.

* [ ] Test category editing plus mutation creation.

* [ ] Test category deletion plus mutation creation.

* [ ] Test category operations that also modify transactions.

* [ ] Verify entity writes roll back if mutation insertion fails.

* [ ] Verify mutation writes roll back if entity insertion fails.

* [ ] Verify local sequence order.

* [ ] Verify two rapid edits generate two ordered mutations.

* [ ] Verify a delete after an update preserves both operations in order.

* [ ] Verify mutations added during sync are not accidentally acknowledged.

---

# Milestone B — Google authorization and spreadsheet initialization

## Google Cloud setup

* [ ] Create a dedicated Google Cloud project for Lootrack.

* [ ] Enable the Google Sheets API.

* [ ] Enable the Google Drive API.

* [ ] Configure the OAuth consent screen.

* [ ] Add development test users.

* [ ] Create a Web OAuth client.

* [ ] Add the local development origin.

```text
http://localhost:4200
```

* [ ] Add the production origin.

* [ ] Request only the minimum required scope.

```text
https://www.googleapis.com/auth/drive.file
```

---

## Google authorization service

* [ ] Add Google Identity Services.

* [ ] Create `GoogleAuthorizationService`.

* [ ] Request an access token only when the user enables synchronization.

* [ ] Keep the access token in memory only.

* [ ] Track access-token expiration.

* [ ] Expose authorization-required state.

* [ ] Implement reconnect.

* [ ] Implement disconnect.

* [ ] Implement token revocation.

* [ ] Never store tokens in IndexedDB.

* [ ] Never store tokens in local storage.

* [ ] Never store tokens in session storage.

* [ ] Never store tokens in NgRx.

* [ ] Never log authorization headers.

* [ ] Never bundle a Google client secret.

---

## Spreadsheet structure

* [ ] Create the following sheets:

```text
Transactions
Categories
Settings
_changes
_meta
```

* [ ] Use one unified `_changes` sheet.

* [ ] Do not split mutations by entity type, because cross-entity ordering must be preserved.

* [ ] Define `_changes` columns.

```text
batchId
batchIndex
batchSize
mutationId
deviceId
sourceSequence
entityType
entityId
operation
baseRevision
baseMutationId
payloadJson
createdAt
```

* [ ] Define `_meta` fields.

```text
format
schemaVersion
datasetId
createdAt
minimumAppVersion
```

* [ ] Generate a unique `datasetId`.

* [ ] Freeze header rows.

* [ ] Hide `_changes`.

* [ ] Hide `_meta`.

* [ ] Protect internal sheets against accidental editing.

* [ ] Treat sheet protection as convenience, not security.

---

## Spreadsheet initializer

* [ ] Create `GoogleSheetsInitializer`.

* [ ] Create the spreadsheet.

* [ ] Rename the default sheet.

* [ ] Add all required sheets.

* [ ] Add headers.

* [ ] Write metadata.

* [ ] Save `spreadsheetId` locally.

* [ ] Save `datasetId` locally.

* [ ] Generate and save a stable `deviceId`.

* [ ] Store the initial remote cursor.

* [ ] Validate `datasetId` before every later sync.

---

## Initial snapshot

* [ ] Read all local transactions.

* [ ] Read all local categories.

* [ ] Read synchronized settings.

* [ ] Write the initial visible spreadsheet state.

* [ ] Create an initial remote synchronization baseline.

* [ ] Decide how existing outbox mutations are handled after snapshot upload.

* [ ] Avoid duplicating changes already represented in the initial snapshot.

* [ ] Save the initial remote cursor.

* [ ] Mark the spreadsheet connection as initialized.

---

# Milestone C — Google Sheets remote adapter

## Adapter interface

* [ ] Create a generic remote adapter interface.

```ts
interface RemoteSyncAdapter {
  initialize(): Promise<SyncConnection>;

  pullChanges(
    cursor: number,
  ): Promise<RemoteMutationBatch[]>;

  appendBatch(
    mutations: readonly OutboxMutation[],
  ): Promise<RemoteBatchResult>;

  writeMaterializedState(
    snapshot: SyncSnapshot,
  ): Promise<void>;
}
```

* [ ] Keep Google-specific code outside NgRx effects.

* [ ] Keep Google-specific code outside local repositories.

---

## Atomic batch upload

* [ ] Snapshot the current outbox before uploading.

```ts
const pending = await getPendingBatch();
```

* [ ] Preserve `localSequence` order.

* [ ] Generate one `batchId`.

* [ ] Assign `batchIndex` values.

* [ ] Include `batchSize` in every row.

* [ ] Append all rows in one Google Sheets request.

* [ ] Use one `AppendCellsRequest` or equivalent atomic batch request.

* [ ] Use raw values for payload data.

* [ ] Do not use formula parsing for user-controlled strings.

* [ ] Treat the batch as acknowledged only after a successful response.

* [ ] Remove only the uploaded mutation IDs.

* [ ] Keep newer mutations added during the request.

---

## Pulling remote mutations

* [ ] Read rows after the stored remote cursor.

* [ ] Parse rows into remote mutation batches.

* [ ] Group rows by `batchId`.

* [ ] Verify each batch contains exactly `batchSize` rows.

* [ ] Verify `batchIndex` values are complete.

* [ ] Sort each batch by `batchIndex`.

* [ ] Reject incomplete batches.

* [ ] Reject malformed payloads.

* [ ] Reject unsupported schema versions.

* [ ] Reject unknown entity types.

* [ ] Reject unknown operation types.

* [ ] Reject invalid UUIDs.

* [ ] Reject invalid revision values.

* [ ] Reject invalid entity payloads.

---

## Idempotency

* [ ] Check `appliedMutations` before applying a remote mutation.

* [ ] Skip already-applied mutation IDs.

* [ ] Record every successfully applied mutation ID.

* [ ] Apply the mutation and record its ID in the same Dexie transaction.

* [ ] Safely tolerate duplicated remote rows.

* [ ] Safely tolerate upload retries after uncertain network failures.

---

# Milestone D — Basic synchronization engine

## Remote mutation applier

* [ ] Create `RemoteMutationApplier`.

* [ ] Apply remote changes directly to Dexie.

* [ ] Do not use normal user-facing repositories.

* [ ] Do not create outbox mutations while applying remote mutations.

* [ ] Apply complete remote batches inside one Dexie transaction.

* [ ] Replay mutations in remote log order.

* [ ] Support transaction upserts.

* [ ] Support transaction deletes.

* [ ] Support category upserts.

* [ ] Support category deletes.

* [ ] Support synchronized settings.

* [ ] Validate entity relationships during or after complete batch application.

---

## Synchronization mutex

* [ ] Prevent two sync runs from executing simultaneously.

* [ ] Ignore or queue repeated sync requests while syncing.

* [ ] Prevent duplicate sync triggers from NgRx effects.

* [ ] Consider multi-tab browser locking later.

---

## Pull cycle

* [ ] Read the current remote cursor.

* [ ] Pull unseen batches.

* [ ] Validate every batch.

* [ ] Skip already-applied mutations.

* [ ] Apply batches in remote order.

* [ ] Save the new cursor only after successful application.

* [ ] Leave the cursor unchanged if application fails.

---

## Push cycle

* [ ] Read an immutable pending-mutation snapshot.

* [ ] Preserve local sequence order.

* [ ] Upload it as one atomic remote batch.

* [ ] Remove only acknowledged mutation IDs.

* [ ] Keep pending mutations created during the upload.

* [ ] Handle empty outbox without making a write request.

---

## Complete synchronization cycle

* [ ] Acquire the sync mutex.

* [ ] Check network availability.

* [ ] Check Google authorization.

* [ ] Validate spreadsheet metadata.

* [ ] Pull remote mutations.

* [ ] Detect conflicts against local pending edits.

* [ ] Apply safe remote mutations.

* [ ] Push the local mutation snapshot.

* [ ] Pull again to catch concurrent remote batches.

* [ ] Update visible spreadsheet tabs.

* [ ] Save `lastSyncAt`.

* [ ] Release the sync mutex in a `finally` block.

---

## NgRx integration

* [ ] Create `syncRequested`.

* [ ] Create `syncStarted`.

* [ ] Create `syncCompleted`.

* [ ] Create `syncFailed`.

* [ ] Create `syncAuthorizationRequired`.

* [ ] Create `syncConflictDetected`.

* [ ] Add a sync effect.

* [ ] Keep row-level remote operations outside NgRx actions.

* [ ] Store only synchronization status in NgRx.

* [ ] Do not store Google access tokens in NgRx.

---

## Synchronization status

* [ ] Define sync status.

```ts
type SyncStatus =
  | "disabled"
  | "idle"
  | "syncing"
  | "offline"
  | "authorization-required"
  | "conflict"
  | "error";
```

* [ ] Display the last successful sync time.

* [ ] Display pending mutation count.

* [ ] Display unresolved conflict count.

* [ ] Add a manual sync button.

* [ ] Add a reconnect button.

* [ ] Add a disconnect button.

---

# Milestone E — Conflict detection

## Base-version comparison

* [ ] For each pending local mutation, read `baseMutationId`.

* [ ] Compare it with the latest remote entity `lastMutationId`.

* [ ] Treat equal IDs as no concurrent remote edit.

* [ ] Treat different IDs as a potential conflict.

* [ ] Do not decide conflicts using `createdAt` alone.

---

## Three-way state preservation

* [ ] Preserve the base entity state.

* [ ] Preserve the local edited state.

* [ ] Preserve the remote edited state.

* [ ] Create a `SyncConflict` record.

* [ ] Do not silently overwrite the local state.

* [ ] Do not silently discard the pending local mutation.

---

## Field-level conflict detection

For every synchronized field:

* [ ] Determine whether the local value differs from the base.

* [ ] Determine whether the remote value differs from the base.

* [ ] Keep the local value when only local changed it.

* [ ] Keep the remote value when only remote changed it.

* [ ] Keep the shared value when both changed to the same result.

* [ ] Mark an unresolved conflict when both changed differently.

Example:

```text
Base amount:   €20
Local amount:  €30
Remote amount: €28
```

Result:

* [ ] Create an unresolved amount conflict.

---

## Deletion conflicts

* [ ] Detect local edit versus remote delete.

* [ ] Detect local delete versus remote edit.

* [ ] Detect local restore versus remote delete.

* [ ] Require explicit resolution initially.

* [ ] Avoid automatically resurrecting remotely deleted records.

* [ ] Avoid automatically deleting locally edited records.

---

# Milestone F — Conflict resolution

## Conflict actions

* [ ] Create `keepLocalVersion`.

* [ ] Create `keepRemoteVersion`.

* [ ] Create `applyMergedVersion`.

* [ ] Create `resolveConflictSuccess`.

* [ ] Create `resolveConflictFailure`.

---

## Conflict-resolution UI

* [ ] Create a list of unresolved conflicts.

* [ ] Display the entity type.

* [ ] Display the transaction or category identity.

* [ ] Show local and remote values side by side.

* [ ] Highlight fields changed on both sides.

* [ ] Add “Keep local”.

* [ ] Add “Keep remote”.

* [ ] Add field-by-field selection.

* [ ] Require confirmation for deletion conflicts.

---

## Resolution mutation

* [ ] Base the resolution on the latest remote version.

* [ ] Create a new mutation ID.

* [ ] Increment the latest revision.

* [ ] Set the resolution mutation as `lastMutationId`.

* [ ] Save the resolved entity.

* [ ] Add the resolution mutation to the outbox.

* [ ] Mark the conflict as resolved.

* [ ] Perform all of these writes atomically.

* [ ] Trigger synchronization again.

---

# Milestone G — Materialized spreadsheet views

## Transactions sheet

* [ ] Define visible transaction columns.

* [ ] Include stable transaction IDs.

* [ ] Include category IDs.

* [ ] Include formatted category names where useful.

* [ ] Exclude tombstones from the normal visible table.

* [ ] Decide whether deleted transactions need a separate view.

---

## Categories sheet

* [ ] Define visible category columns.

* [ ] Include stable category IDs.

* [ ] Exclude deleted categories from the default view.

---

## Settings sheet

* [ ] Include only synchronized settings.

* [ ] Keep device-local settings out of the remote sheet.

---

## Snapshot materialization

* [ ] Build the latest state from IndexedDB.

* [ ] Rewrite visible tabs after successful synchronization.

* [ ] Use batch writes.

* [ ] Keep `_changes` as the synchronization source.

* [ ] Treat visible sheets as app-managed views.

* [ ] Do not support direct sheet editing yet.

---

# Milestone H — Reliability and security hardening

## Retry strategy

* [ ] Retry HTTP `429`.

* [ ] Retry HTTP `500`.

* [ ] Retry HTTP `502`.

* [ ] Retry HTTP `503`.

* [ ] Retry HTTP `504`.

* [ ] Use exponential backoff.

* [ ] Add random jitter.

* [ ] Limit maximum attempts.

* [ ] Do not automatically retry permanent validation failures.

* [ ] Do not automatically retry ordinary authorization failures.

---

## Uncertain upload outcomes

* [ ] Handle the case where Google applied the batch but the response was lost.

* [ ] Retry using the same mutation IDs.

* [ ] Treat duplicate mutation IDs as already applied.

* [ ] Never assume network failure means remote failure.

---

## Remote validation

* [ ] Validate UUIDs.

* [ ] Validate entity types.

* [ ] Validate operations.

* [ ] Validate JSON payloads.

* [ ] Validate integer monetary amounts.

* [ ] Validate transaction types.

* [ ] Validate ISO dates.

* [ ] Validate revision numbers.

* [ ] Validate category references.

* [ ] Validate description lengths.

* [ ] Validate the spreadsheet `datasetId`.

* [ ] Validate the remote schema version.

* [ ] Quarantine malformed mutations.

* [ ] Do not partially apply malformed batches.

---

## Security

* [ ] Use only `drive.file`.

* [ ] Use exact authorized origins.

* [ ] Use HTTPS in production.

* [ ] Keep access tokens in memory.

* [ ] Never expose client secrets.

* [ ] Never log financial payloads in production.

* [ ] Never log authorization headers.

* [ ] Use raw spreadsheet input for user data.

* [ ] Clearly explain that synced financial data is stored in the user’s Google account.

* [ ] Warn that spreadsheet sharing also shares Lootrack financial data.

---

## Disconnect flow

* [ ] Revoke Google authorization.

* [ ] Clear connection metadata.

* [ ] Preserve local transactions and categories.

* [ ] Ask whether pending mutations should be retained.

* [ ] Allow reconnecting to the same spreadsheet.

* [ ] Allow starting with a new spreadsheet.

* [ ] Verify the `datasetId` before reconnecting.

---

# Milestone I — Automatic sync and later improvements

## Automatic sync triggers

* [ ] Sync when the app starts.

* [ ] Sync when the app returns to the foreground.

* [ ] Sync when network connectivity returns.

* [ ] Sync after local mutations with a debounce.

* [ ] Keep manual synchronization available.

* [ ] Avoid syncing on every keystroke.

---

## Diagnostics

* [ ] Store the last successful sync time.

* [ ] Store the last attempted sync time.

* [ ] Store pending mutation count.

* [ ] Store unresolved conflict count.

* [ ] Store the remote cursor.

* [ ] Store a non-sensitive error category.

* [ ] Add a diagnostics section in settings.

---

## Mutation-log compaction

* [ ] Define a maximum log size or age.

* [ ] Generate a complete canonical snapshot.

* [ ] Write a new log baseline.

* [ ] Reset or migrate remote cursors.

* [ ] Keep compaction atomic.

* [ ] Ensure old devices can detect an obsolete cursor.

---

## Direct spreadsheet editing

Do not begin this until app-driven synchronization is stable.

* [ ] Define which visible cells may be edited manually.

* [ ] Detect spreadsheet-side changes.

* [ ] Convert sheet edits into valid Lootrack mutations.

* [ ] Validate edited values.

* [ ] Preserve entity IDs.

* [ ] Consider Apps Script for change capture.

* [ ] Add conflict handling for sheet-side edits.

---

## Backend-assisted synchronization

Consider a backend only when Lootrack needs:

* [ ] Background synchronization.
* [ ] Secure refresh-token storage.
* [ ] Push notifications.
* [ ] Shared household budgets.
* [ ] Multiple users editing the same dataset.
* [ ] Stronger transaction and locking guarantees.
