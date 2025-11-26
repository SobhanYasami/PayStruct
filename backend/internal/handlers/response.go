package handlers

import (
	"time"
)

// APIResponse is the standard JSON response envelope for all API endpoints.
type APIResponse struct {
	// Status indicates the outcome (success, bad_request, etc.)
	Status ResponseStatus `json:"status"`

	// Message is a human-readable message (success or error explanation)
	Message string `json:"message,omitempty"`

	// Data contains the actual response payload (can be nil)
	Data any `json:"data,omitempty"`

	// Errors provides detailed validation or field errors (for 4xx responses)
	Errors any `json:"errors,omitempty"`

	// Metadata contains useful debugging/context info
	Meta *ResponseMeta `json:"meta,omitempty"`

	// RequestID helps trace requests in logs (highly recommended in microservices)
	RequestID string `json:"request_id,omitempty"`

	// Timestamp of when the response was generated (ISO 8601)
	Timestamp time.Time `json:"timestamp"`
}

// ResponseMeta contains optional metadata
type ResponseMeta struct {
	// Total count for paginated responses
	Total *int `json:"total,omitempty"`

	// Pagination cursor/token
	Cursor *string `json:"cursor,omitempty"`

	// Current page number
	Page *int `json:"page,omitempty"`

	// Items per page
	Limit *int `json:"limit,omitempty"`

	// Custom fields can be added per endpoint if needed
}

// Helper constructor functions (highly recommended!)
func SuccessResponse(data any, message ...string) APIResponse {
	msg := "Operation completed successfully"
	if len(message) > 0 {
		msg = message[0]
	}

	return APIResponse{
		Status:    Success,
		Message:   msg,
		Data:      data,
		Timestamp: time.Now().UTC(),
	}
}

func CreatedResponse(data any, message ...string) APIResponse {
	msg := "Resource created successfully"
	if len(message) > 0 {
		msg = message[0]
	}

	resp := SuccessResponse(data, msg)
	resp.Status = Created
	return resp
}

func ErrorResponse(status ResponseStatus, message string, errors ...any) APIResponse {
	resp := APIResponse{
		Status:    status,
		Message:   message,
		Timestamp: time.Now().UTC(),
	}

	if len(errors) > 0 {
		resp.Errors = errors[0]
	}

	return resp
}

// WithRequestID adds request tracing (use middleware to populate this!)
func (r APIResponse) WithRequestID(id string) APIResponse {
	r.RequestID = id
	return r
}

func (r APIResponse) WithMeta(meta ResponseMeta) APIResponse {
	r.Meta = &meta
	return r
}
