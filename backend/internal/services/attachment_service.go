package services

import (
	"context"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
	model "github.com/sobhan-yasami/docs-db-panel/internal/models"
	"gorm.io/gorm"
)

const (
	maxAttachmentsPerContract = 3
	maxFileSizeBytes          = 25 << 20 // 25 MB
)

var allowedMIMEs = map[string]struct{}{
	"application/pdf": {},
	"image/jpeg":      {},
	"image/png":       {},
	"image/gif":       {},
}

type AttachmentService struct {
	db          *gorm.DB
	storageRoot string
	baseURL     string
}

func NewAttachmentService(db *gorm.DB, storageRoot, baseURL string) *AttachmentService {
	return &AttachmentService{db: db, storageRoot: storageRoot, baseURL: baseURL}
}

func (s *AttachmentService) attachmentURL(storageKey string) string {
	return s.baseURL + "/files-storage/" + storageKey
}

func sanitizeFilename(name string) string {
	name = filepath.Base(name)
	name = strings.ReplaceAll(name, "/", "_")
	name = strings.ReplaceAll(name, "\\", "_")
	if len(name) > 200 {
		name = name[len(name)-200:]
	}
	return name
}

func (s *AttachmentService) Upload(
	_ context.Context,
	contractID, companyID, uploaderID, documentType string,
	fh *multipart.FileHeader,
) (*model.Attachment, error) {
	// If a document_type is given and a file for that type already exists, replace it.
	if documentType != "" {
		var existing model.Attachment
		if err := s.db.First(&existing,
			"entity_type = 'contract' AND entity_id = ? AND document_type = ? AND deleted_at IS NULL",
			contractID, documentType).Error; err == nil {
			_ = os.Remove(filepath.Join(s.storageRoot, existing.StorageKey))
			s.db.Delete(&existing)
		}
	}

	// Count remaining non-deleted attachments for this contract.
	var count int64
	if err := s.db.Model(&model.Attachment{}).
		Where("entity_type = 'contract' AND entity_id = ? AND deleted_at IS NULL", contractID).
		Count(&count).Error; err != nil {
		return nil, &ServiceError{Code: 500, Message: "database error"}
	}
	if count >= maxAttachmentsPerContract {
		return nil, &ServiceError{Code: 422, Message: "maximum 3 documents per contract"}
	}

	if fh.Size > maxFileSizeBytes {
		return nil, &ServiceError{Code: 422, Message: "file exceeds 25 MB limit"}
	}

	f, err := fh.Open()
	if err != nil {
		return nil, &ServiceError{Code: 400, Message: "cannot open upload"}
	}
	defer f.Close()

	// Magic-byte MIME detection — read first 512 bytes.
	sniff := make([]byte, 512)
	n, _ := f.Read(sniff)
	mime := http.DetectContentType(sniff[:n])
	// Trim parameters (e.g. "text/plain; charset=utf-8" → "text/plain").
	if idx := strings.Index(mime, ";"); idx != -1 {
		mime = strings.TrimSpace(mime[:idx])
	}
	if _, ok := allowedMIMEs[mime]; !ok {
		return nil, &ServiceError{Code: 422, Message: fmt.Sprintf("file type %q not allowed (pdf, jpeg, png, gif only)", mime)}
	}

	// Reset reader to start.
	if _, err := f.(io.Seeker).Seek(0, io.SeekStart); err != nil {
		return nil, &ServiceError{Code: 500, Message: "cannot seek upload"}
	}

	cid, err := uuid.Parse(contractID)
	if err != nil {
		return nil, &ServiceError{Code: 400, Message: "invalid contract id"}
	}
	compID, err := uuid.Parse(companyID)
	if err != nil {
		return nil, &ServiceError{Code: 400, Message: "invalid company id"}
	}
	uplID, err := uuid.Parse(uploaderID)
	if err != nil {
		return nil, &ServiceError{Code: 400, Message: "invalid uploader id"}
	}

	fileID, err := uuid.NewV7()
	if err != nil {
		return nil, &ServiceError{Code: 500, Message: "uuid generation failed"}
	}

	safeName := sanitizeFilename(fh.Filename)
	storageKey := fmt.Sprintf("contracts/%s/%s_%s", contractID, fileID.String(), safeName)
	diskPath := filepath.Join(s.storageRoot, storageKey)

	if err := os.MkdirAll(filepath.Dir(diskPath), 0o755); err != nil {
		return nil, &ServiceError{Code: 500, Message: "storage directory error"}
	}
	out, err := os.Create(diskPath)
	if err != nil {
		return nil, &ServiceError{Code: 500, Message: "cannot create storage file"}
	}
	defer out.Close()

	if _, err := io.Copy(out, f); err != nil {
		os.Remove(diskPath)
		return nil, &ServiceError{Code: 500, Message: "file write failed"}
	}

	att := &model.Attachment{
		CompanyID:    compID,
		EntityType:   "contract",
		EntityID:     cid,
		DocumentType: documentType,
		FileName:     safeName,
		StorageKey:   storageKey,
		MimeType:     mime,
		SizeBytes:    fh.Size,
		UploadedByID: uplID,
	}
	if err := s.db.Create(att).Error; err != nil {
		os.Remove(diskPath)
		return nil, &ServiceError{Code: 500, Message: "database insert failed"}
	}

	att.URL = s.attachmentURL(storageKey)
	return att, nil
}

func (s *AttachmentService) ListByContract(_ context.Context, contractID string) ([]model.Attachment, error) {
	var atts []model.Attachment
	if err := s.db.
		Where("entity_type = 'contract' AND entity_id = ? AND deleted_at IS NULL", contractID).
		Order("created_at ASC").
		Find(&atts).Error; err != nil {
		return nil, &ServiceError{Code: 500, Message: "database error"}
	}
	for i := range atts {
		atts[i].URL = s.attachmentURL(atts[i].StorageKey)
	}
	return atts, nil
}

func (s *AttachmentService) Delete(_ context.Context, id, companyID string) error {
	var att model.Attachment
	if err := s.db.First(&att, "id = ? AND company_id = ? AND deleted_at IS NULL", id, companyID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return &ServiceError{Code: 404, Message: "attachment not found"}
		}
		return &ServiceError{Code: 500, Message: "database error"}
	}

	diskPath := filepath.Join(s.storageRoot, att.StorageKey)
	_ = os.Remove(diskPath)

	if err := s.db.Delete(&att).Error; err != nil {
		return &ServiceError{Code: 500, Message: "database delete failed"}
	}
	return nil
}
