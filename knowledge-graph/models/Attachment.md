---
tags: [model, entity]
updated: 2026-06-15
---

# Attachment

Table: `attachments`  
File: `backend/internal/models/approval.go`

Polymorphic file metadata. Currently only `entity_type = "contract"` is used.

## Fields

| Field | Type | Notes |
|-------|------|-------|
| `company_id` | UUID | tenant scoping |
| `entity_type` | varchar(64) | `"contract"` currently |
| `entity_id` | UUID | the entity this file belongs to |
| `file_name` | varchar(255) | original filename |
| `storage_key` | varchar(512) | relative path under `../storage/` — e.g. `contracts/{id}/{uuid}_{name}` |
| `mime_type` | varchar(128) | validated via magic bytes on upload |
| `size_bytes` | int64 | file size |
| `uploaded_by_id` | UUID | FK → Employee |
| `url` | string | `gorm:"-"` computed at query time: `baseURL + "/files-storage/" + storage_key` |

## Constraints

- Max **3 attachments** per contract (enforced in `AttachmentService.Upload`)
- Max **25 MB** per file
- Allowed MIME: `application/pdf`, `image/jpeg`, `image/png`, `image/gif`
- MIME validated via `net/http.DetectContentType` (magic bytes, not extension)
- Filename sanitized: strip path separators, limit 200 chars

## Storage Layout

```
../storage/
  contracts/
    {contract_uuid}/
      {upload_uuid}_{sanitized_filename}
```

Served at: `/files-storage/contracts/{uuid}/{filename}`

## API

Upload: `POST /contracts/:id/attachments` (multipart, field `"file"`)  
List: `GET /contracts/:id/attachments`  
Delete: `DELETE /attachments/:id` (head roles)

→ [[backend/Attachment Service]], [[models/Contract]]
