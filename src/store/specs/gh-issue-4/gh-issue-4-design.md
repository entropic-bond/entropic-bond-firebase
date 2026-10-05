# Design — Per-query pagination cursors in FirebaseDatasource (gh-issue-4)

## Abstract

`FirebaseDatasource` currently keeps pagination state (`_lastConstraints`,
`_lastCollectionName`, `_lastDocRetrieved`, `_lastLimit`) on the shared adapter
instance and exposes `next()`. Since `Store` holds a single data source, two
`Model`s paginating over the same (or a different) collection clobber each
other. The core `entropic-bond@2.0.0` moves pagination into a per-query
`QueryCursor` returned by `DataSource.find()`.

This change makes `FirebaseDatasource.find()` return a new
`FirebaseQueryCursor` (a `QueryCursor` subclass) that owns the collection, the
base Firestore query, the page size and the last retrieved snapshot. The
adapter's `next()` and all `_last*` fields are deleted.

## Seams and data flow

```
Model.query()
   │  find( preprocessedQueryObject, collectionName )
   ▼
FirebaseDatasource.find()                 ── builds base Query (no limit)
   │  new FirebaseQueryCursor( baseQuery, queryObject.limit ?? 0 )
   ▼
Model.__cursor  ──next(limit?)──►  FirebaseQueryCursor.next()
                                      │  query( baseQuery, limit(pageSize) [, startAfter(snapshot)] )
                                      │  getDocs(...)
                                      └─► records last QueryDocumentSnapshot, returns page
```

```
Model A ──find──► Cursor A ──next──► page A      (page size 2)
Model B ──find──► Cursor B ──next──► page B      (page size 3)
Model A ──────────A.next()────────► user3,user4  (Cursor A state only)
Model B ──────────B.next()────────► user4,user5,user6 (Cursor B state only)
```

## Plan

1. Add `FirebaseQueryCursor extends QueryCursor` in `firebase-datasource.ts`.
   - Holds `_baseQuery`, `_pageSize` and the last `QueryDocumentSnapshot`.
   - `next( limit? )` applies `limit( pageSize )` (unless the page size is 0)
     and `startAfter( lastSnapshot )`, records the new last snapshot, and marks
     the cursor exhausted when the result is empty (or shorter than the page),
     so later calls return `[]` without re-querying the collection.
2. Change `FirebaseDatasource.find()` to return the cursor built from the base
   query and `queryObject.limit`.
3. Remove the limit push and the `_last*` writes from
   `queryObjectToQueryConstraints()`; keep it a pure query builder (still used
   by `count()` and `onCollectionChange()`).
4. Delete `FirebaseDatasource.next()` and the `_last*` fields.

## Proposed changes

- `src/store/firebase-datasource.ts`
  - import `QueryCursor` and implement `FirebaseQueryCursor`.
  - `find()` returns `Promise< QueryCursor >`.
  - `queryObjectToQueryConstraints()` stops mutating adapter state and stops
    injecting the first-page `limit`.
  - remove `next()`, `getFromQuery()` and `_lastDocRetrieved`/`_lastConstraints`/
    `_lastLimit`/`_lastCollectionName`.
- `src/store/firebase-datasource.spec.ts`
  - keep the `Data Cursors` suite passing through `model.find().get(n)` /
    `model.next(n)`.
  - add interleaving (REQ-2), cross-collection (REQ-3) and re-query (REQ-4)
    cases; assert `onCollectionChange` still works after the state moved.

## Proposed updates

- `package.json` (and `functions/package.json`): bump `entropic-bond` to
  `^2.0.0` (the adapter no longer compiles against `^1.x`).
- No change to README.

## Best practices taken

- **Locality**: all pagination arithmetic and Firestore snapshot bookkeeping
  live in `FirebaseQueryCursor`; the adapter is stateless again.
- **Depth**: the caller keeps a small handle with one method (`next`); the
  server-side `startAfter`/`limit` mechanics are hidden.
- **No shared mutable state**: each `find()` produces its own cursor, so
  interleaved queries are isolated by construction.
- **Reuse**: `QueryCursor` from core is extended rather than reimplemented.

## Strengths and weaknesses

Strengths:
- Fixes interleaved pagination for the same collection and across collections.
- Keeps the public `Model` API (`find().get(n)`, `model.next()`) unchanged.
- Lazily pages Firestore with `startAfter`, so no eager full-collection load.

Weaknesses:
- Breaking change for consumers that call `datasource.find()`/`datasource.next()`
  directly, or subclass the adapter.
- The no-limit path (`limit` 0) still materializes all matching documents on the
  first `next()`, one page at a time is not possible without a user page size.
- A cursor is not re-entrant: concurrent `next()` calls share its position
  (acceptable; pagination is sequential).

## Audit note (code-auditor)

Reviewed `gh-issue-4.feature` against `firebase-datasource.ts` (tests excluded).
No major architectural improvements required.

- **Seam**: `DataSource.find()` is a real seam (two adapters exist:
  `JsonDataSource` and `FirebaseDatasource`), and the cursor is a value the
  caller owns, which is what removes the shared state.
- **Depth**: `FirebaseQueryCursor` hides the base query, page size, last
  snapshot and exhaustion behind one `next( limit? )` method. Deleting it would
  scatter `startAfter`/`limit`/snapshot bookkeeping across `find()` and
  `onCollectionChange()`.
- **Interface is the test surface**: the `Data Cursors` tests cross the same
  seam through `Model`; no private fields are asserted.

Less valuable, intentionally not changed:

- `find()` wraps `new FirebaseQueryCursor(...)` in `Promise.resolve` instead of
  being `async`; equivalent and keeps the return type explicit.
- `_pageSize` duplicates the base `QueryCursor._limit` because the core field is
  private. Setting only the subclass field would lose the semantic link; not
  worth reflecting into core.
- With no page size, the cursor does not mark itself exhausted after the first
  page, so a later `next()` may return documents added after the query. This is
  harmless and arguably more useful than core's frozen-set behaviour.
