---
tags: [backend, service, attachments]
updated: 2026-06-15
---

# Attachment Service

File: `backend/internal/services/attachment_service.go`  
Handler: `backend/internal/handlers/attachment_handler.go`

## Upload Constraints

- Max **3 attachments** per contract (COUNT query before insert)
- Max **25 MB** per file (`fh.Size > 25<<20`)
- Allowed MIME types (validated via `net/http.DetectContentType` on first 512 bytes):
  - `application/pdf`
  - `image/jpeg`
  - `image/png`
  - `image/gif`
- Filename sanitized: strip path separators (`/`, `\`), limit 200 chars

## Storage

```
struct AttachmentService {
    db          *gorm.DB
    storageRoot string   // from STORAGE_ROOT env or "../storage"
    baseURL     string   // from BASE_URL env or "http://localhost:5000"
}
```

Storage key: `contracts/{contractID}/{uuid}_{sanitizedFilename}`  
Full disk path: `{storageRoot}/{storage_key}`  
Public URL: `{baseURL}/files-storage/{storage_key}`

URL is **not persisted** — computed at query time and set on `Attachment.URL` (`gorm:"-"`).

## API

| Method | Path | Notes |
|--------|------|-------|
| POST | `/contracts/:id/attachments` | multipart, field `"file"` |
| GET | `/contracts/:id/attachments` | returns `[]Attachment` with URL field |
| DELETE | `/attachments/:id` | removes from disk + soft-deletes row; head roles only |

## Frontend Integration

`frontend/src/lib/api/contracts.ts`:
```ts
listAttachments: (contractId) => apiFetch<Envelope<Attachment[]>>(`/contracts/${contractId}/attachments`)
uploadAttachment: (contractId, file: File) => {
  const fd = new FormData(); fd.append("file", file);
  return apiFetch(...)  // Content-Type NOT set (FormData sets multipart boundary)
}
deleteAttachment: (id) => apiFetch(`/attachments/${id}`, { method: "DELETE" })
```

Note: `apiFetch` skips `Content-Type: application/json` header when body is `FormData` — lets browser set multipart boundary automatically.

## Viewer

`frontend/src/components/domain/DocumentViewer.tsx` — modal viewer:
- `application/pdf` → `<PDFViewer>` (pdf.js, canvas render)
- `image/*` → `<img>`
- other → download link

`PDFViewer` uses `pdfjsLib.GlobalWorkerOptions.workerSrc` pointing to CDN to avoid Turbopack bundling issues.

→ [[models/Attachment]], [[models/Contract]]
