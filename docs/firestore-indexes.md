# Firestore Composite Indexes

## Discovery profiles query
The `/api/discovery` endpoint uses a `profiles` collection query that filters by `batch` and orders by `email`.

Required composite index configuration:

- Collection: `profiles`
- Field: `batch` ASC
- Field: `email` ASC

Create this index in the Firebase Console to avoid `FAILED_PRECONDITION` errors.
