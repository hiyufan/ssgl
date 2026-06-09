package security

import (
	"net/http"

	"github.com/casbin/casbin/v2"
	"github.com/casbin/casbin/v2/model"
	"github.com/gin-gonic/gin"
)

// CasbinRBAC returns a middleware that enforces RBAC using Casbin
func CasbinRBAC(enforcer *casbin.Enforcer) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get user role from context
		role, exists := c.Get("role")
		if !exists {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error":   "forbidden",
				"message": "No role found",
			})
			return
		}

		// Get request path and method
		path := c.Request.URL.Path
		method := c.Request.Method

		// Check permission
		ok, err := enforcer.Enforce(role.(string), path, method)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
				"error":   "internal_error",
				"message": "Failed to check permissions",
			})
			return
		}

		if !ok {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error":   "forbidden",
				"message": "You don't have permission to access this resource",
			})
			return
		}

		c.Next()
	}
}

// DefaultRBACModel returns the default RBAC model configuration
func DefaultRBACModel() string {
	return `
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act

[role_definition]
g = _, _

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = g(r.sub, p.sub) && r.obj == p.obj && r.act == p.act
`
}

// DefaultRBACPolicy returns the default RBAC policy
func DefaultRBACPolicy() [][]string {
	return [][]string{
		// Admin permissions
		{"admin", "/api/v1/competitions", "GET"},
		{"admin", "/api/v1/competitions", "POST"},
		{"admin", "/api/v1/competitions/:id", "PUT"},
		{"admin", "/api/v1/competitions/:id", "DELETE"},
		{"admin", "/api/v1/competitions/:id/publish", "POST"},
		{"admin", "/api/v1/teams", "GET"},
		{"admin", "/api/v1/workflows", "GET"},
		{"admin", "/api/v1/workflows/:id/approve", "POST"},
		{"admin", "/api/v1/workflows/:id/reject", "POST"},
		{"admin", "/api/v1/awards", "GET"},
		{"admin", "/api/v1/awards/:id/settle", "POST"},
		{"admin", "/api/v1/evaluations", "GET"},
		{"admin", "/api/v1/stats/overview", "GET"},
		{"admin", "/api/v1/stats/competitions", "GET"},
		{"admin", "/api/v1/stats/teachers", "GET"},
		{"admin", "/api/v1/users", "GET"},

		// Teacher permissions
		{"teacher", "/api/v1/competitions", "GET"},
		{"teacher", "/api/v1/teams", "GET"},
		{"teacher", "/api/v1/workflows", "GET"},
		{"teacher", "/api/v1/workflows/:id/approve", "POST"},
		{"teacher", "/api/v1/workflows/:id/reject", "POST"},
		{"teacher", "/api/v1/awards", "GET"},
		{"teacher", "/api/v1/evaluations", "GET"},
		{"teacher", "/api/v1/stats/overview", "GET"},

		// Student permissions
		{"student", "/api/v1/competitions", "GET"},
		{"student", "/api/v1/teams", "GET"},
		{"student", "/api/v1/teams", "POST"},
		{"student", "/api/v1/teams/:id/join", "POST"},
		{"student", "/api/v1/teams/:id/leave", "DELETE"},
		{"student", "/api/v1/pre-plans", "GET"},
		{"student", "/api/v1/pre-plans", "POST"},
		{"student", "/api/v1/evaluations", "GET"},
		{"student", "/api/v1/evaluations", "POST"},

		// Common permissions (all authenticated users)
		{"student", "/api/v1/users/me", "GET"},
		{"teacher", "/api/v1/users/me", "GET"},
		{"admin", "/api/v1/users/me", "GET"},
	}
}

// InitCasbin initializes Casbin enforcer with default policies
func InitCasbin() (*casbin.Enforcer, error) {
	modelText := DefaultRBACModel()

	// Create model from text
	m, err := model.NewModelFromString(modelText)
	if err != nil {
		return nil, err
	}

	// Create enforcer (in-memory adapter for simplicity)
	enforcer, err := casbin.NewEnforcer(m)
	if err != nil {
		return nil, err
	}

	// Load default policies
	policies := DefaultRBACPolicy()
	for _, p := range policies {
		enforcer.AddPolicy(p)
	}

	return enforcer, nil
}
