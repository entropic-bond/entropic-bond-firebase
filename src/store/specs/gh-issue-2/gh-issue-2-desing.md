# Design — Document change existence semantics (gh-issue-2)

## Strategy and design

The bug lives in `FirebaseDatasource.onDocumentChange`
(`src/store/firebase-datasource.ts:93`). It hardcodes `type: 'update'` and maps
`after` to `snapshot.data()`, so a deleted document and a not-yet-created one
produce the same indistinguishable change.

Strategies evaluated:

- **A — emit `type: 'delete'` when `!snapshot.exists()`**: fixes the wrong
  `type`, consistent with `onCollectionChange`. Weakness: the initial empty
  snapshot of a never-created document still looks identical to a deletion, so
  consumers must add existence-tracking logic.
- **B — expose `snapshot.exists()` on the change**: gives consumers the raw
  signal but keeps the wrong `type: 'update'` for deletions.
- **C — suppress every `!exists()` snapshot**: breaks deletion detection —
  consumers would never learn a document was deleted. Rejected.
- **D — suppress only the initial empty snapshot (chosen)**: track the
  previous existence state per subscription. The first snapshot of a
  never-created document is the noise that crashes consumers, so skip it; any
  later transition from `exists → !exists` is a real deletion and is emitted as
  `type: 'delete'`. This mirrors `onCollectionChange`, which only emits
  `removed → 'delete'` for documents that were previously part of the query.

### ASCII graph of component interaction

```
Consumer (Model.onDocumentChange)
   │  onSnapshot fires
   ▼
FirebaseDatasource.onDocumentChange   (closure state: previousExists)
   │
   ├─ previousExists === undefined && !exists
   │     └─ initial empty snapshot of never-created doc → SKIP (no event)
   │
   └─ otherwise
         ├─ exists  → type: 'update', after: data,      params.exists: true
         └─ !exists → type: 'delete', after: undefined, params.exists: false
   │
   ▼
Consumer sees:
   never-created doc → no event until it is created
   deletion          → type 'delete' (+ params.exists false)
   update            → type 'update' (+ params.exists true)
```

## Proposed changes

1. In `onDocumentChange` (`src/store/firebase-datasource.ts`):
   - Add a closure variable `previousExists: boolean | undefined`.
   - If the first snapshot reports the document does not exist, update
     `previousExists` and return without invoking the listener.
   - Map `type` from the snapshot: `'update'` when it exists,
     `'delete'` when it does not.
   - Add `exists: snapshot.exists()` to `params`, keeping the original
     `snapshot.metadata` fields (spread).

## Proposed updates

- Existing test `should listen for delete changes in document` asserts
  `type: 'update'` for a deletion — this encodes the bug and must change to
  `type: 'delete'` (and `params.exists: false`).
- Add tests for REQ-1 (no spurious event for never-created doc), REQ-3 (update
  type kept), REQ-4 (params.exists true/false).

## Best practices used

- Consistency with existing `onCollectionChange` mapping (`removed → 'delete'`).
- Data source filters out the noise event instead of pushing existence
  bookkeeping onto every consumer.
- No new dependencies; typed through `params?: { [key: string]: any }`.

## Tasks

1. Add failing tests to `src/store/firebase-datasource.spec.ts` for REQ-1,
   REQ-2, REQ-3, REQ-4 (one per scenario, `REQ-n` suffix) and update the
   existing deletion test to expect `type: 'delete'`.
2. Implement the fix in `onDocumentChange`.
3. Run the emulator test suite and the typecheck/lint gates.

## Strengths and weaknesses

Strengths:
- Directly fixes the reported crash: a subscription on a brand-new document
  never delivers a misleading initial empty change.
- Real deletions are still reported with the correct `type: 'delete'`.
- Consistent with `onCollectionChange` (no events for documents that were never
  part of the watched state).
- No consumer-side existence bookkeeping required.

Weaknesses:
- The data source becomes stateful per subscription (a closure variable) and
  relies on `onSnapshot` delivering the initial state as the first callback,
  which Firestore guarantees.
- A consumer that subscribes to an already-deleted document receives no initial
  "empty" event (Firestore itself cannot report "has ever existed").