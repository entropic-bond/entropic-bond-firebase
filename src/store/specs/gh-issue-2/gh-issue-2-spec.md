# Spec — `onDocumentChange` cannot distinguish a deleted document from a not-yet-created one

GitHub issue: https://github.com/entropic-bond/entropic-bond-firebase/issues/2

## Task description

`FirebaseDatasource.onDocumentChange` (single-document listener) hardcodes
`type: 'update'` and `before: undefined` and maps `after` to `snapshot.data()`,
which is `undefined` for a deleted document AND for a not-yet-created one.
Consumers therefore cannot distinguish a document that was deleted from a
document that has never existed.

Fix `onDocumentChange` so a consumer that subscribes to a brand-new document
**before** it is created does not receive a spurious data-less change, while
real deletions are still reported with `type: 'delete'` (consistent with the
`removed → 'delete'` mapping already used by `onCollectionChange`).

## Requirements

### REQ-1
`onDocumentChange` does not emit a change for the initial empty snapshot of a
document that has never existed: subscribing to a not-yet-created document id
delivers no change until the document is actually created.

### REQ-2
`onDocumentChange` emits a change with `type: 'delete'` when a previously
existing document is deleted (previously it hardcoded `type: 'update'`).

### REQ-3
When the snapshot contains the document (`snapshot.exists()` is true),
`onDocumentChange` keeps emitting `type: 'update'` with `after` set to the
document data (no behavior change for existing documents).

### REQ-4
Every change emitted by `onDocumentChange` exposes the document existence state
under `params.exists` (`true` for updates of an existing document, `false` for
deletions).