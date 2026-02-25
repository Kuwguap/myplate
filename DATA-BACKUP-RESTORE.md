# Data storage, backup, and restore

All stored data (documents, templates, uploads) lives in **one place**: the backend’s **data directory**. Use the same layout locally and on Render so you can backup, restore, and keep “where you left off” consistent.

## Where data lives

| Item | Location | Description |
|------|----------|-------------|
| **SQLite database** | `{dataRoot}/data.db` | Documents, templates metadata, form data. |
| **Uploaded template PDFs** | `{dataRoot}/uploads/templates/` | Template files referenced by the DB. |

`dataRoot` is:

- **Local:** current working directory when you run the backend (usually `backend/`), or `DATA_PATH` if set.
- **Render:** `DATA_PATH` (e.g. `/data`) when you attach a persistent disk; otherwise the service’s ephemeral filesystem (data is lost on restart/redeploy).

So:

- **One database** = one `data.db`.
- **All stored files** = that one directory (`data.db` + `uploads/templates/`).

There is no separate “database” and “file store”—everything is under this single data root.

## Consistency (offline vs online)

- **Local:** Your data is in `backend/data.db` and `backend/uploads/` (or whatever `DATA_PATH` you use). This is your “offline” state.
- **Render (no disk):** Data is ephemeral. Each deploy/restart wipes it. Good for trying the app; not for keeping state.
- **Render (with persistent disk):** Set **Disks** → mount path e.g. `/data`, and **Environment** → `DATA_PATH=/data`. Then the same `data.db` and `uploads/templates/` live on the disk and persist across deploys. That’s your “online” single source of truth.

To have **consistency from where you left off**:

1. Use a **persistent disk** on Render and set `DATA_PATH` so production always uses the same DB and files.
2. Optionally **backup** that data (see below) so you can restore or move it (e.g. to another env or back to local).

## Backup (save current state)

Backup = copy the data root: the database plus the uploads folder.

**Local (e.g. before a big change or to move to production):**

- From the repo root, the backend data root is usually `backend/` (or the path in `DATA_PATH`).
- Copy:
  - `backend/data.db`
  - `backend/uploads/` (entire folder)

You can zip them, e.g.:

```powershell
# From repo root
Compress-Archive -Path backend\data.db, backend\uploads -DestinationPath backend-backup.zip
```

**Render (with persistent disk):**

- Use **Render Shell** (if available) or an admin/script that runs on the service to zip `$DATA_PATH` (e.g. `/data`) and expose it for download, or use an external backup (e.g. periodic job that copies `data.db` and `uploads/` to S3 or another store).

## Restore (move data back or into production)

Restore = put the same `data.db` and `uploads/` back into the backend’s data root.

**Local:**

1. Stop the backend.
2. Replace `backend/data.db` and `backend/uploads/` with your backup (or unzip `backend-backup.zip` into `backend/`).
3. Start the backend again.

**Render:**

- With a **persistent disk**, the data root is e.g. `/data`. To “move” data from local to Render:
  1. Backup locally (as above).
  2. Use Render Shell or a one-off job to write `data.db` and `uploads/` into `/data` (e.g. upload the zip and unzip there, or use a small script that accepts a backup URL and restores it).  
  Alternatively, use a DB/file storage that both local and Render can use (e.g. external DB + S3), which would require code changes.

For most setups, **enable the persistent disk and set `DATA_PATH`** so production keeps one consistent database and set of files; then backup that directory when you need a snapshot or to migrate.

## Quick checklist

1. **Render:** Add a disk (e.g. `/data`, 1 GB) to **pdf-generator-api** and set **`DATA_PATH=/data`**. Redeploy.
2. **Backup:** Copy `data.db` and `uploads/` from your backend data directory (local or Render) and keep them in a zip or backup store.
3. **Restore:** Put `data.db` and `uploads/` back into the backend data root (and set `DATA_PATH` on Render to that root if needed), then restart the backend.

This keeps a single database and one place for all stored files so you can resume from the same state offline and online.
