package handlers

import (
	"testing"
)

func TestWorkflowHandler_NilService(t *testing.T) {
	handler := NewWorkflowHandler(nil)
	if handler.workflowService != nil {
		t.Error("expected workflowService to be nil when created with nil")
	}
}

func TestApproveRequest_Fields(t *testing.T) {
	req := ApproveRequest{
		Comment: "审核通过，方案可行",
	}

	if req.Comment != "审核通过，方案可行" {
		t.Errorf("expected Comment='审核通过，方案可行', got '%s'", req.Comment)
	}
}

func TestApproveRequest_EmptyComment(t *testing.T) {
	req := ApproveRequest{
		Comment: "",
	}

	// ApproveRequest allows empty comment (no binding:"required")
	if req.Comment != "" {
		t.Errorf("expected empty Comment, got '%s'", req.Comment)
	}
}

func TestRejectRequest_Fields(t *testing.T) {
	req := RejectRequest{
		Comment: "方案不够详细，需要补充市场分析",
	}

	if req.Comment != "方案不够详细，需要补充市场分析" {
		t.Errorf("expected Comment='方案不够详细，需要补充市场分析', got '%s'", req.Comment)
	}
}

func TestRejectRequest_EmptyComment(t *testing.T) {
	req := RejectRequest{
		Comment: "",
	}

	// RejectRequest has binding:"required" on Comment
	// At the struct level, it's just an empty string
	if req.Comment != "" {
		t.Errorf("expected empty Comment, got '%s'", req.Comment)
	}
}
