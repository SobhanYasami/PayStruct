package handlers

// ResponseStatus represents the high-level outcome of an API request.
// Used in JSON responses to indicate the result type in a machine-readable way.
type ResponseStatus string

// General success statuses
const (
	Success   ResponseStatus = "success"    // 2xx generic success
	Created   ResponseStatus = "created"    // 201 Created
	Updated   ResponseStatus = "updated"    // 200/204 after update
	Deleted   ResponseStatus = "deleted"    // 200/204 after delete
	Accepted  ResponseStatus = "accepted"   // 202 Accepted (async)
	NoContent ResponseStatus = "no_content" // 204 No Content
)

// Client errors (4xx)
const (
	BadRequest          ResponseStatus = "bad_request"          // 400
	Unauthorized        ResponseStatus = "unauthorized"         // 401
	Forbidden           ResponseStatus = "forbidden"            // 403
	NotFound            ResponseStatus = "not_found"            // 404
	Conflict            ResponseStatus = "conflict"             // 409
	UnprocessableEntity ResponseStatus = "unprocessable_entity" // 422
	TooManyRequests     ResponseStatus = "too_many_requests"    // 429
	InvalidToken        ResponseStatus = "invalid_token"        // Custom: token expired/revoked
)

// Server errors (5xx)
const (
	Error              ResponseStatus = "error"               // Generic fallback
	InternalError      ResponseStatus = "internal_error"      // 500
	NotImplemented     ResponseStatus = "not_implemented"     // 501
	ServiceUnavailable ResponseStatus = "service_unavailable" // 503
	Timeout            ResponseStatus = "timeout"             // Gateway timeout or deadline exceeded
)

// Business logic failures (can map to 400 or 422 depending on context)
const (
	Failure             ResponseStatus = "failure"              // Generic business failure
	ValidationFailed    ResponseStatus = "validation_failed"    // Explicit validation
	InsufficientBalance ResponseStatus = "insufficient_balance" // Example domain-specific
	ResourceExhausted   ResponseStatus = "resource_exhausted"   // Quota/credit limit
)

// Helper methods for clearer conditionals
func (s ResponseStatus) IsSuccess() bool {
	switch s {
	case Success, Created, Updated, Deleted, Accepted, NoContent:
		return true
	default:
		return false
	}
}

func (s ResponseStatus) IsClientError() bool {
	switch s {
	case BadRequest, Unauthorized, Forbidden, NotFound, Conflict,
		UnprocessableEntity, TooManyRequests, InvalidToken,
		ValidationFailed:
		return true
	default:
		return false
	}
}

func (s ResponseStatus) IsServerError() bool {
	switch s {
	case InternalError, NotImplemented, ServiceUnavailable, Timeout:
		return true
	default:
		return false
	}
}

// Optional: Map status to recommended HTTP status code
func (s ResponseStatus) HTTPStatus() int {
	switch s {
	case Success, Updated, Deleted:
		return 200
	case Created:
		return 201
	case Accepted:
		return 202
	case NoContent:
		return 204

	case BadRequest, ValidationFailed:
		return 400
	case Unauthorized, InvalidToken:
		return 401
	case Forbidden:
		return 403
	case NotFound:
		return 404
	case Conflict:
		return 409
	case UnprocessableEntity:
		return 422
	case TooManyRequests:
		return 429

	case InternalError:
		return 500
	case NotImplemented:
		return 501
	case ServiceUnavailable:
		return 503
	case Timeout:
		return 504

	default:
		return 200 // Success by default, or 400/500 based on IsClientError/IsServerError
	}
}
