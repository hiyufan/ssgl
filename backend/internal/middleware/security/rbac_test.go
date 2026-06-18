package security

import (
	"testing"
)

// --- DefaultRBACModel tests ---

func TestDefaultRBACModel_NotEmpty(t *testing.T) {
	m := DefaultRBACModel()
	if m == "" {
		t.Error("expected non-empty RBAC model")
	}
}

func TestDefaultRBACModel_ContainsRequestDefinition(t *testing.T) {
	m := DefaultRBACModel()
	if !strContains(m, "[request_definition]") {
		t.Error("model should contain [request_definition]")
	}
}

func TestDefaultRBACModel_ContainsPolicyDefinition(t *testing.T) {
	m := DefaultRBACModel()
	if !strContains(m, "[policy_definition]") {
		t.Error("model should contain [policy_definition]")
	}
}

func TestDefaultRBACModel_ContainsRoleDefinition(t *testing.T) {
	m := DefaultRBACModel()
	if !strContains(m, "[role_definition]") {
		t.Error("model should contain [role_definition]")
	}
}

func TestDefaultRBACModel_ContainsPolicyEffect(t *testing.T) {
	m := DefaultRBACModel()
	if !strContains(m, "[policy_effect]") {
		t.Error("model should contain [policy_effect]")
	}
}

func TestDefaultRBACModel_ContainsMatchers(t *testing.T) {
	m := DefaultRBACModel()
	if !strContains(m, "[matchers]") {
		t.Error("model should contain [matchers]")
	}
}

func TestDefaultRBACModel_DefinesSubObjAct(t *testing.T) {
	m := DefaultRBACModel()
	if !strContains(m, "sub, obj, act") {
		t.Error("model should define sub, obj, act")
	}
}

// --- DefaultRBACPolicy tests ---

func TestDefaultRBACPolicy_NotEmpty(t *testing.T) {
	p := DefaultRBACPolicy()
	if len(p) == 0 {
		t.Error("expected non-empty policy")
	}
}

func TestDefaultRBACPolicy_AllEntriesHaveThreeFields(t *testing.T) {
	p := DefaultRBACPolicy()
	for i, entry := range p {
		if len(entry) != 3 {
			t.Errorf("policy entry %d has %d fields, expected 3: %v", i, len(entry), entry)
		}
	}
}

func TestDefaultRBACPolicy_HasAdminRole(t *testing.T) {
	p := DefaultRBACPolicy()
	found := false
	for _, entry := range p {
		if entry[0] == "admin" {
			found = true
			break
		}
	}
	if !found {
		t.Error("expected at least one admin policy entry")
	}
}

func TestDefaultRBACPolicy_HasTeacherRole(t *testing.T) {
	p := DefaultRBACPolicy()
	found := false
	for _, entry := range p {
		if entry[0] == "teacher" {
			found = true
			break
		}
	}
	if !found {
		t.Error("expected at least one teacher policy entry")
	}
}

func TestDefaultRBACPolicy_HasStudentRole(t *testing.T) {
	p := DefaultRBACPolicy()
	found := false
	for _, entry := range p {
		if entry[0] == "student" {
			found = true
			break
		}
	}
	if !found {
		t.Error("expected at least one student policy entry")
	}
}

func TestDefaultRBACPolicy_ValidHTTPMethods(t *testing.T) {
	validMethods := map[string]bool{"GET": true, "POST": true, "PUT": true, "DELETE": true, "PATCH": true}
	p := DefaultRBACPolicy()
	for _, entry := range p {
		if !validMethods[entry[2]] {
			t.Errorf("unexpected HTTP method '%s' in policy entry %v", entry[2], entry)
		}
	}
}

func TestDefaultRBACPolicy_PathsStartWithAPI(t *testing.T) {
	p := DefaultRBACPolicy()
	for _, entry := range p {
		if len(entry[1]) < 4 || entry[1][:4] != "/api" {
			t.Errorf("policy path '%s' does not start with /api", entry[1])
		}
	}
}

// --- InitCasbin tests ---

func TestInitCasbin_Success(t *testing.T) {
	enforcer, err := InitCasbin()
	if err != nil {
		t.Fatalf("InitCasbin failed: %v", err)
	}
	if enforcer == nil {
		t.Fatal("expected non-nil enforcer")
	}
}

func TestInitCasbin_HasPolicies(t *testing.T) {
	enforcer, _ := InitCasbin()
	policies, _ := enforcer.GetPolicy()
	if len(policies) == 0 {
		t.Error("expected enforcer to have policies loaded")
	}
}

func TestInitCasbin_AdminCanGetCompetitions(t *testing.T) {
	enforcer, _ := InitCasbin()
	ok, err := enforcer.Enforce("admin", "/api/v1/competitions", "GET")
	if err != nil {
		t.Fatalf("enforce error: %v", err)
	}
	if !ok {
		t.Error("expected admin to be allowed GET /api/v1/competitions")
	}
}

func TestInitCasbin_StudentCanGetCompetitions(t *testing.T) {
	enforcer, _ := InitCasbin()
	ok, err := enforcer.Enforce("student", "/api/v1/competitions", "GET")
	if err != nil {
		t.Fatalf("enforce error: %v", err)
	}
	if !ok {
		t.Error("expected student to be allowed GET /api/v1/competitions")
	}
}

func TestInitCasbin_StudentCannotDeleteCompetitions(t *testing.T) {
	enforcer, _ := InitCasbin()
	ok, _ := enforcer.Enforce("student", "/api/v1/competitions/:id", "DELETE")
	if ok {
		t.Error("expected student to be denied DELETE /api/v1/competitions/:id")
	}
}

func TestInitCasbin_UnknownRoleDenied(t *testing.T) {
	enforcer, _ := InitCasbin()
	ok, _ := enforcer.Enforce("unknown", "/api/v1/competitions", "GET")
	if ok {
		t.Error("expected unknown role to be denied")
	}
}

func TestInitCasbin_AdminCanManageUsers(t *testing.T) {
	enforcer, _ := InitCasbin()
	ok, _ := enforcer.Enforce("admin", "/api/v1/users", "GET")
	if !ok {
		t.Error("expected admin to be allowed GET /api/v1/users")
	}
}
