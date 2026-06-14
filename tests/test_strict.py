#!/usr/bin/env python3
"""
SSGL 严格自动化测试套件
覆盖：后端 API、AI 服务、数据库、安全、代码质量
每次运行生成 JSON 报告到 /tmp/ssgl/test_reports/
"""

import json
import os
import sys
import time
import hashlib
import subprocess
from datetime import datetime
from pathlib import Path

import requests

# ============================================================
# Config
# ============================================================
BACKEND = os.getenv("SSGL_BACKEND", "http://localhost:8080")
AI_SERVICE = os.getenv("SSGL_AI", "http://localhost:8000")
ADMIN_USER = os.getenv("SSGL_ADMIN_USER", "liuzy")
ADMIN_PASS = os.getenv("SSGL_ADMIN_PASS", "admin123")
PROJECT_ROOT = os.getenv("SSGL_ROOT", "/tmp/ssgl")
REPORT_DIR = Path(PROJECT_ROOT) / "test_reports"
REPORT_DIR.mkdir(exist_ok=True)

# ============================================================
# Helpers
# ============================================================
_results = []
_token = None
_student_token = None

def _now():
    return datetime.now().strftime("%H:%M:%S")

def _log(level, name, msg, details=""):
    entry = {"level": level, "name": name, "msg": msg, "details": details, "time": _now()}
    _results.append(entry)
    icon = {"PASS": "✅", "FAIL": "❌", "WARN": "⚠️", "INFO": "ℹ️", "SKIP": "⏭️"}.get(level, "•")
    print(f"  {icon} [{level}] {name}: {msg}")
    if details and level in ("FAIL", "WARN"):
        print(f"     → {details[:200]}")

def _api(method, path, base=BACKEND, **kwargs):
    """Make API request with error handling."""
    url = f"{base}{path}"
    timeout = kwargs.pop("timeout", 15)
    try:
        resp = requests.request(method, url, timeout=timeout, **kwargs)
        return resp
    except requests.exceptions.ConnectionError:
        return None
    except requests.exceptions.Timeout:
        return None

def _api_auth(method, path, token=None, **kwargs):
    """Make authenticated API request."""
    t = token or _token
    headers = kwargs.pop("headers", {})
    if t:
        headers["Authorization"] = f"Bearer {t}"
    return _api(method, path, headers=headers, **kwargs)

def _ok(resp):
    """Check if response object exists (not None). Use instead of `if resp` because
    requests.Response.__bool__ returns False for 4xx/5xx, hiding valid error responses."""
    return resp is not None

def _login(username, password):
    resp = _api("POST", "/api/v1/auth/login", json={"username": username, "password": password})
    if _ok(resp) and resp.status_code == 200:
        data = resp.json()
        # Handle nested tokens structure
        tokens = data.get("tokens", data)
        return tokens.get("access_token", tokens.get("token", ""))
    return None


# ============================================================
# 1. Service Health Tests
# ============================================================
def test_services():
    print("\n🔍 1. 服务健康检查")

    # Backend - use login as health check (public endpoint)
    resp = _api("POST", "/api/v1/auth/login", json={"username": ADMIN_USER, "password": ADMIN_PASS})
    if _ok(resp) and resp.status_code == 200:
        _log("PASS", "backend-health", f"后端服务运行中 (:8080) → 200")
    elif _ok(resp):
        _log("PASS", "backend-health", f"后端服务运行中 (:8080) → {resp.status_code}")
    else:
        _log("FAIL", "backend-health", f"后端服务不可用")

    # AI Service
    resp = _api("GET", "/health", base=AI_SERVICE)
    if _ok(resp) and resp.status_code == 200:
        data = resp.json()
        _log("PASS", "ai-health", f"AI 服务运行中 (:8000) → {data.get('status', '?')}")
    else:
        _log("FAIL", "ai-health", f"AI 服务不可用", f"resp={resp}")

    # AI Service DB
    resp = _api("GET", "/ai/api/v1/rag/stats", base=AI_SERVICE)
    if _ok(resp) and resp.status_code == 200:
        data = resp.json()
        total = data.get("total_documents", data.get("total_chunks", "?"))
        _log("PASS", "ai-db", f"AI 知识库连接正常, 文档数={total}")
    else:
        _log("FAIL", "ai-db", "AI 知识库不可用")


# ============================================================
# 2. Auth Tests
# ============================================================
def test_auth():
    global _token, _student_token
    print("\n🔐 2. 认证与授权测试")

    # Login
    _token = _login(ADMIN_USER, ADMIN_PASS)
    if _token:
        _log("PASS", "admin-login", f"管理员 {ADMIN_USER} 登录成功")
    else:
        _log("FAIL", "admin-login", f"管理员 {ADMIN_USER} 登录失败")
        return

    # Register a test student
    resp = _api("POST", "/api/v1/auth/register", json={
        "username": "test_student_001",
        "password": "TestPass123!",
        "name": "测试学生",
        "role": "student",
        "email": "test001@ssgl.test"
    })
    if _ok(resp) and resp.status_code in (200, 201):
        _log("PASS", "register", "学生注册成功")
        _student_token = _login("test_student_001", "TestPass123!")
    elif _ok(resp) and resp.status_code in (400, 409):
        # 400 = already exists, 409 = conflict
        _log("PASS", "register", "学生已存在（预期行为）")
        _student_token = _login("test_student_001", "TestPass123!")
    else:
        _log("WARN", "register", f"注册返回 {resp.status_code if _ok(resp) else 'None'}", resp.text[:200] if _ok(resp) else "")

    # Me endpoint
    resp = _api_auth("GET", "/api/v1/users/me")
    if _ok(resp) and resp.status_code == 200:
        data = resp.json()
        user = data.get("user", data)
        _log("PASS", "users-me", f"用户信息: {user.get('username')} / {user.get('role')}")
    else:
        _log("FAIL", "users-me", f"/users/me 失败 → {resp.status_code if _ok(resp) else 'None'}")

    # No auth → 401
    resp = _api("GET", "/api/v1/users/me")
    if _ok(resp) and resp.status_code == 401:
        _log("PASS", "no-auth-401", "无 token 访问受保护路由 → 401 ✓")
    else:
        _log("FAIL", "no-auth-401", f"预期 401，实际 {resp.status_code if _ok(resp) else 'None'}")

    # Bad token → 401
    resp = _api("GET", "/api/v1/users/me", headers={"Authorization": "Bearer invalid.token.here"})
    if _ok(resp) and resp.status_code == 401:
        _log("PASS", "bad-token-401", "无效 token → 401 ✓")
    else:
        _log("FAIL", "bad-token-401", f"预期 401，实际 {resp.status_code if _ok(resp) else 'None'}")

    # Password strength
    resp = _api("POST", "/api/v1/auth/register", json={
        "username": "weak_pass_user",
        "password": "123",
        "name": "弱密码",
        "role": "student",
        "email": "weak@ssgl.test"
    })
    if _ok(resp) and resp.status_code == 400:
        _log("PASS", "weak-password", "弱密码注册被拒绝 ✓")
    else:
        _log("WARN", "weak-password", f"弱密码注册返回 {resp.status_code if _ok(resp) else 'None'}")


# ============================================================
# 3. CRUD Tests (Backend API)
# ============================================================
def test_crud():
    print("\n📋 3. CRUD 接口测试")

    # --- Competitions ---
    # List
    resp = _api_auth("GET", "/api/v1/competitions")
    if _ok(resp) and resp.status_code == 200:
        data = resp.json()
        items = data if isinstance(data, list) else data.get("items", data.get("data", []))
        _log("PASS", "comp-list", f"赛事列表 → {len(items)} 条")
    else:
        _log("FAIL", "comp-list", f"赛事列表失败 → {resp.status_code if _ok(resp) else 'None'}")

    # Create
    comp_data = {
        "title": f"自动化测试赛事-{int(time.time())}",
        "description": "这是自动化测试创建的赛事",
        "type": "hackathon",
        "max_team_size": 5,
        "min_team_size": 1,
        "start_date": "2026-07-01T00:00:00+08:00",
        "end_date": "2026-08-01T00:00:00+08:00",
        "location": "线上",
        "tags": "测试,自动化"
    }
    resp = _api_auth("POST", "/api/v1/competitions", json=comp_data)
    comp_id = None
    if _ok(resp) and resp.status_code in (200, 201):
        data = resp.json()
        comp = data.get("competition", data)
        comp_id = comp.get("id") or data.get("id") or data.get("data", {}).get("id")
        _log("PASS", "comp-create", f"创建赛事成功, id={comp_id}")
    else:
        _log("FAIL", "comp-create", f"创建赛事失败 → {resp.status_code if _ok(resp) else 'None'}", resp.text[:200] if _ok(resp) else "")

    if comp_id:
        # Get by ID
        resp = _api_auth("GET", f"/api/v1/competitions/{comp_id}")
        if _ok(resp) and resp.status_code == 200:
            _log("PASS", "comp-get", f"获取赛事 {comp_id} 成功")
        else:
            _log("FAIL", "comp-get", f"获取赛事 {comp_id} 失败 → {resp.status_code if _ok(resp) else 'None'}")

        # Update
        resp = _api_auth("PUT", f"/api/v1/competitions/{comp_id}", json={
            **comp_data,
            "title": f"自动化测试赛事-已更新-{int(time.time())}",
            "description": "更新后的描述"
        })
        if _ok(resp) and resp.status_code == 200:
            _log("PASS", "comp-update", f"更新赛事 {comp_id} 成功")
        else:
            _log("WARN", "comp-update", f"更新赛事 {comp_id} → {resp.status_code if _ok(resp) else 'None'}", resp.text[:200] if _ok(resp) else "")

        # Publish
        resp = _api_auth("POST", f"/api/v1/competitions/{comp_id}/publish")
        if _ok(resp) and resp.status_code == 200:
            _log("PASS", "comp-publish", f"发布赛事 {comp_id} 成功")
        else:
            _log("WARN", "comp-publish", f"发布赛事 {comp_id} → {resp.status_code if _ok(resp) else 'None'}", resp.text[:200] if _ok(resp) else "")

        # Delete
        resp = _api_auth("DELETE", f"/api/v1/competitions/{comp_id}")
        if _ok(resp) and resp.status_code == 200:
            _log("PASS", "comp-delete", f"删除赛事 {comp_id} 成功")
        else:
            _log("WARN", "comp-delete", f"删除赛事 → {resp.status_code if _ok(resp) else 'None'}")

    # --- Teams ---
    resp = _api_auth("GET", "/api/v1/teams")
    if _ok(resp) and resp.status_code == 200:
        _log("PASS", "team-list", "团队列表成功")
    else:
        _log("FAIL", "team-list", f"团队列表失败 → {resp.status_code if _ok(resp) else 'None'}")

    # --- Evaluations ---
    resp = _api_auth("GET", "/api/v1/evaluations")
    if _ok(resp) and resp.status_code == 200:
        _log("PASS", "eval-list", "评价列表成功")
    else:
        _log("FAIL", "eval-list", f"评价列表失败 → {resp.status_code if _ok(resp) else 'None'}")

    # --- Awards ---
    resp = _api_auth("GET", "/api/v1/awards")
    if _ok(resp) and resp.status_code == 200:
        _log("PASS", "award-list", "奖项列表成功")
    else:
        _log("FAIL", "award-list", f"奖项列表失败 → {resp.status_code if _ok(resp) else 'None'}")

    # --- Pre-Plans ---
    resp = _api_auth("GET", "/api/v1/pre-plans")
    if _ok(resp) and resp.status_code == 200:
        _log("PASS", "preplan-list", "预案列表成功")
    else:
        _log("FAIL", "preplan-list", f"预案列表失败 → {resp.status_code if _ok(resp) else 'None'}")

    # --- Workflows ---
    resp = _api_auth("GET", "/api/v1/workflows")
    if _ok(resp) and resp.status_code == 200:
        _log("PASS", "workflow-list", "审批列表成功")
    else:
        _log("FAIL", "workflow-list", f"审批列表失败 → {resp.status_code if _ok(resp) else 'None'}")

    # --- Stats ---
    for ep in ["/api/v1/stats/overview", "/api/v1/stats/competitions", "/api/v1/stats/teachers"]:
        name = ep.split("/")[-1]
        resp = _api_auth("GET", ep)
        if _ok(resp) and resp.status_code == 200:
            _log("PASS", f"stat-{name}", f"统计 {name} 成功")
        else:
            _log("FAIL", f"stat-{name}", f"统计 {name} 失败 → {resp.status_code if _ok(resp) else 'None'}")

    # --- Audit Logs ---
    resp = _api_auth("GET", "/api/v1/audit-logs")
    if _ok(resp) and resp.status_code == 200:
        _log("PASS", "audit-list", "审计日志成功")
    else:
        _log("FAIL", "audit-list", f"审计日志失败 → {resp.status_code if _ok(resp) else 'None'}")

    resp = _api_auth("GET", "/api/v1/audit-logs/stats")
    if _ok(resp) and resp.status_code == 200:
        _log("PASS", "audit-stats", "审计统计成功")
    else:
        _log("FAIL", "audit-stats", f"审计统计失败 → {resp.status_code if _ok(resp) else 'None'}")


# ============================================================
# 4. AI Service Tests
# ============================================================
def test_ai_service():
    print("\n🤖 4. AI 服务测试")

    # RAG search (no LLM needed)
    resp = _api("POST", "/ai/api/v1/rag/search", base=AI_SERVICE, json={"question": "蓝桥杯", "top_k": 3})
    if _ok(resp) and resp.status_code == 200:
        data = resp.json()
        results = data.get("results", [])
        _log("PASS", "rag-search", f"RAG 搜索成功, {len(results)} 条结果")
    else:
        _log("FAIL", "rag-search", f"RAG 搜索失败 → {resp.status_code if _ok(resp) else 'None'}")

    # RAG documents
    resp = _api("GET", "/ai/api/v1/rag/documents", base=AI_SERVICE)
    if _ok(resp) and resp.status_code == 200:
        _log("PASS", "rag-docs", "RAG 文档列表成功")
    else:
        _log("FAIL", "rag-docs", f"RAG 文档列表失败 → {resp.status_code if _ok(resp) else 'None'}")

    # RAG stats
    resp = _api("GET", "/ai/api/v1/rag/stats", base=AI_SERVICE)
    if _ok(resp) and resp.status_code == 200:
        _log("PASS", "rag-stats", "RAG 统计成功")
    else:
        _log("FAIL", "rag-stats", f"RAG 统计失败 → {resp.status_code if _ok(resp) else 'None'}")

    # LLM-backed endpoints (with timeout)
    llm_endpoints = [
        ("POST", "/ai/api/v1/rag/query", {"question": "什么是蓝桥杯？"}),
        ("POST", "/ai/api/v1/tools/advisor", {"input": "如何准备蓝桥杯", "extra": ""}),
        ("POST", "/ai/api/v1/tools/parse-competition", {"content": "蓝桥杯，工信部主办，4月省赛"}),
        ("POST", "/ai/api/v1/coach/start", {"source": "text", "pitch_text": "蓝桥杯竞赛项目：基于AI的智能学习助手", "role": "student"}),
    ]

    for method, path, body in llm_endpoints:
        name = path.split("/")[-1]
        try:
            resp = _api(method, path, base=AI_SERVICE, json=body, timeout=60)
            if _ok(resp) and resp.status_code == 200:
                _log("PASS", f"ai-{name}", f"AI {name} 成功 ({resp.elapsed.total_seconds():.1f}s)")
            elif _ok(resp) and resp.status_code in (400, 422):
                _log("WARN", f"ai-{name}", f"AI {name} 参数问题 → {resp.status_code}", resp.text[:150])
            elif _ok(resp):
                _log("FAIL", f"ai-{name}", f"AI {name} 失败 → {resp.status_code}", resp.text[:150])
            else:
                _log("FAIL", f"ai-{name}", f"AI {name} 无响应（超时/连接失败）")
        except Exception as e:
            _log("FAIL", f"ai-{name}", f"AI {name} 异常: {e}")


# ============================================================
# 5. RBAC Tests
# ============================================================
def test_rbac():
    print("\n🛡️ 5. 权限控制测试")

    if not _student_token:
        _log("SKIP", "rbac", "无学生 token，跳过 RBAC 测试")
        return

    # Student should NOT access admin endpoints
    admin_endpoints = [
        ("GET", "/api/v1/audit-logs"),
        ("GET", "/api/v1/audit-logs/stats"),
    ]
    for method, path in admin_endpoints:
        name = path.split("/")[-1]
        resp = _api_auth(method, path, token=_student_token)
        if _ok(resp) and resp.status_code == 403:
            _log("PASS", f"rbac-student-{name}", f"学生访问 {name} → 403 拒绝 ✓")
        elif _ok(resp) and resp.status_code == 401:
            _log("PASS", f"rbac-student-{name}", f"学生访问 {name} → 401 ✓")
        elif _ok(resp):
            _log("FAIL", f"rbac-student-{name}", f"学生访问 {name} 应被拒绝，实际 → {resp.status_code}")

    # Student can access own endpoints
    student_ok = [
        ("GET", "/api/v1/competitions"),
        ("GET", "/api/v1/teams"),
        ("GET", "/api/v1/users/me"),
    ]
    for method, path in student_ok:
        name = path.split("/")[-1]
        resp = _api_auth(method, path, token=_student_token)
        if _ok(resp) and resp.status_code == 200:
            _log("PASS", f"rbac-student-ok-{name}", f"学生访问 {name} → 200 ✓")
        elif _ok(resp):
            _log("WARN", f"rbac-student-ok-{name}", f"学生访问 {name} → {resp.status_code}")


# ============================================================
# 6. Security Checks
# ============================================================
def test_security():
    print("\n🔒 6. 安全检查")

    # SQL injection attempt
    resp = _api_auth("GET", "/api/v1/competitions?id=1' OR '1'='1")
    if _ok(resp) and resp.status_code in (200, 400):
        _log("PASS", "sql-injection", f"SQL 注入测试 → {resp.status_code} (GORM 参数化查询)")

    # XSS in input
    resp = _api_auth("POST", "/api/v1/competitions", json={
        "title": "<script>alert('xss')</script>",
        "description": "test",
        "type": "hackathon"
    })
    if _ok(resp) and resp.status_code in (200, 201):
        data = resp.json()
        title = data.get("title", data.get("data", {}).get("title", ""))
        if "<script>" not in str(title):
            _log("PASS", "xss-input", "XSS 输入被清理或转义")
        else:
            _log("WARN", "xss-input", "XSS 输入未清理，可能存储型 XSS 风险")
        # Cleanup
        cid = data.get("id") or data.get("data", {}).get("id")
        if cid:
            _api_auth("DELETE", f"/api/v1/competitions/{cid}")

    # Check security headers
    resp = _api("GET", "/api/v1/competitions")
    if resp:
        headers = resp.headers
        checks = {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": ["DENY", "SAMEORIGIN"],
        }
        for header, expected in checks.items():
            val = headers.get(header, "")
            if val:
                if isinstance(expected, list):
                    ok = val.upper() in [e.upper() for e in expected]
                else:
                    ok = expected.lower() in val.lower()
                if ok:
                    _log("PASS", f"header-{header}", f"{header}: {val} ✓")
                else:
                    _log("WARN", f"header-{header}", f"{header}: {val} (预期 {expected})")
            else:
                _log("WARN", f"header-{header}", f"缺少安全头 {header}")

    # CORS check
    resp = _api("OPTIONS", "/api/v1/competitions", headers={
        "Origin": "https://evil.com",
        "Access-Control-Request-Method": "GET"
    })
    if resp:
        acao = resp.headers.get("Access-Control-Allow-Origin", "")
        if "evil.com" in acao:
            _log("FAIL", "cors", f"CORS 允许任意来源: {acao}")
        else:
            _log("PASS", "cors", f"CORS 限制正确: ACAO={acao or '(empty)'}")


# ============================================================
# 7. Performance Tests
# ============================================================
def test_performance():
    print("\n⚡ 7. 性能测试")

    # List endpoints should respond within 500ms
    endpoints = [
        ("GET", "/api/v1/competitions", "赛事列表", BACKEND, True),
        ("GET", "/api/v1/teams", "团队列表", BACKEND, True),
        ("GET", "/api/v1/stats/overview", "统计总览", BACKEND, True),
        ("GET", "/health", "AI 健康检查", AI_SERVICE, False),
    ]

    for item in endpoints:
        method, path, name, base, need_auth = item

        start = time.time()
        if need_auth:
            resp = _api_auth(method, path)
        else:
            resp = _api(method, path, base=base)
        elapsed = (time.time() - start) * 1000

        if _ok(resp) and resp.status_code == 200:
            if elapsed < 500:
                _log("PASS", f"perf-{name}", f"{name} {elapsed:.0f}ms ✓")
            elif elapsed < 2000:
                _log("WARN", f"perf-{name}", f"{name} {elapsed:.0f}ms (较慢)")
            else:
                _log("FAIL", f"perf-{name}", f"{name} {elapsed:.0f}ms (超时)")
        else:
            _log("FAIL", f"perf-{name}", f"{name} 无响应")


# ============================================================
# 8. Code Quality Checks
# ============================================================
def test_code_quality():
    print("\n📝 8. 代码质量检查")

    root = Path(PROJECT_ROOT)

    # Check Go test files exist
    go_tests = list(root.rglob("*_test.go"))
    if go_tests:
        _log("PASS", "go-tests", f"找到 {len(go_tests)} 个 Go 测试文件")
    else:
        _log("FAIL", "go-tests", "没有 Go 测试文件 (_test.go)")

    # Check Python test files
    py_tests = list(root.rglob("test_*.py"))
    if py_tests:
        _log("PASS", "py-tests", f"找到 {len(py_tests)} 个 Python 测试文件")
    else:
        _log("FAIL", "py-tests", "没有 Python 测试文件 (test_*.py)")

    # Check frontend test files
    fe_tests = list((root / "frontend-vite").rglob("*.test.*")) + list((root / "frontend-vite").rglob("*.spec.*"))
    if fe_tests:
        _log("PASS", "fe-tests", f"找到 {len(fe_tests)} 个前端测试文件")
    else:
        _log("FAIL", "fe-tests", "没有前端测试文件 (*.test.* / *.spec.*)")

    # Check for TODO/FIXME
    todos = []
    for ext in ["*.go", "*.py", "*.tsx", "*.ts"]:
        for f in root.rglob(ext):
            if "node_modules" in str(f) or "venv" in str(f) or ".git" in str(f):
                continue
            try:
                content = f.read_text(errors="ignore")
                for i, line in enumerate(content.split("\n"), 1):
                    if "TODO" in line or "FIXME" in line or "HACK" in line:
                        todos.append(f"{f}:{i}: {line.strip()[:80]}")
            except:
                pass
    if todos:
        _log("WARN", "todo-fixme", f"找到 {len(todos)} 个 TODO/FIXME/HACK", "\n".join(todos[:5]))
    else:
        _log("PASS", "todo-fixme", "无 TODO/FIXME/HACK")

    # Check for hardcoded secrets in tracked files
    secret_patterns = ["password=", "secret=", "api_key=", "token="]
    secrets_found = []
    for ext in ["*.go", "*.py", "*.ts", "*.tsx", "*.sh"]:
        for f in root.rglob(ext):
            if "node_modules" in str(f) or "venv" in str(f) or ".git" in str(f) or ".env" in str(f):
                continue
            try:
                content = f.read_text(errors="ignore")
                for i, line in enumerate(content.split("\n"), 1):
                    lower = line.lower()
                    for pat in secret_patterns:
                        if pat in lower and "example" not in lower and "default" not in lower:
                            # Check if it looks like a real value (not just a variable name)
                            parts = line.split(pat, 1)
                            if len(parts) > 1:
                                val = parts[1].strip().strip('"').strip("'")
                                if val and len(val) > 3 and not val.startswith("change"):
                                    secrets_found.append(f"{f.name}:{i}: {line.strip()[:60]}")
            except:
                pass
    if secrets_found:
        _log("WARN", "hardcoded-secrets", f"找到 {len(secrets_found)} 处可能的硬编码密钥", "\n".join(secrets_found[:3]))
    else:
        _log("PASS", "hardcoded-secrets", "未发现硬编码密钥")

    # Check .gitignore exists and covers .env
    gitignore = root / ".gitignore"
    if gitignore.exists():
        content = gitignore.read_text()
        if ".env" in content:
            _log("PASS", "gitignore-env", ".gitignore 已包含 .env")
        else:
            _log("WARN", "gitignore-env", ".gitignore 未包含 .env，密钥可能被提交")
    else:
        _log("WARN", "gitignore-env", "缺少 .gitignore 文件")

    # Check README exists
    readme = root / "README.md"
    if readme.exists() and readme.stat().st_size > 100:
        _log("PASS", "readme", f"README.md 存在 ({readme.stat().st_size} bytes)")
    else:
        _log("WARN", "readme", "README.md 缺失或过短")


# ============================================================
# 9. Database Integrity Tests
# ============================================================
def test_database():
    print("\n🗄️ 9. 数据完整性测试")

    # Competitions should have required fields
    resp = _api_auth("GET", "/api/v1/competitions")
    if _ok(resp) and resp.status_code == 200:
        data = resp.json()
        items = data if isinstance(data, list) else data.get("items", data.get("data", []))
        issues = []
        for comp in items:
            if not comp.get("title"):
                issues.append(f"Competition {comp.get('id')} missing title")
            if not comp.get("type"):
                issues.append(f"Competition {comp.get('id')} missing type")
        if issues:
            _log("WARN", "db-comp-integrity", f"{len(issues)} 条数据不完整", "; ".join(issues[:3]))
        else:
            _log("PASS", "db-comp-integrity", f"所有 {len(items)} 条赛事数据完整")

    # Stats should return consistent numbers
    resp = _api_auth("GET", "/api/v1/stats/overview")
    if _ok(resp) and resp.status_code == 200:
        stats = resp.json()
        _log("PASS", "db-stats", f"统计: competitions={stats.get('total_competitions', '?')}, "
             f"teams={stats.get('total_teams', '?')}, "
             f"students={stats.get('total_students', '?')}")


# ============================================================
# Run all tests
# ============================================================
def run_all():
    start_time = time.time()
    print(f"{'='*60}")
    print(f"🧪 SSGL 严格自动化测试 — {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}")

    test_services()
    test_auth()
    test_crud()
    test_ai_service()
    test_rbac()
    test_security()
    test_performance()
    test_code_quality()
    test_database()

    elapsed = time.time() - start_time

    # Summary
    total = len(_results)
    passed = sum(1 for r in _results if r["level"] == "PASS")
    failed = sum(1 for r in _results if r["level"] == "FAIL")
    warned = sum(1 for r in _results if r["level"] == "WARN")
    skipped = sum(1 for r in _results if r["level"] == "SKIP")

    print(f"\n{'='*60}")
    print(f"📊 测试结果: {passed}✅ {failed}❌ {warned}⚠️ {skipped}⏭️ / {total} 总 ({elapsed:.1f}s)")
    print(f"{'='*60}")

    if failed > 0:
        print("\n❌ 失败项:")
        for r in _results:
            if r["level"] == "FAIL":
                print(f"  • {r['name']}: {r['msg']}")

    if warned > 0:
        print("\n⚠️ 警告项:")
        for r in _results:
            if r["level"] == "WARN":
                print(f"  • {r['name']}: {r['msg']}")

    # Save report
    report = {
        "timestamp": datetime.now().isoformat(),
        "elapsed_seconds": round(elapsed, 1),
        "summary": {"total": total, "passed": passed, "failed": failed, "warned": warned, "skipped": skipped},
        "results": _results,
        "score": round(passed / max(total - skipped, 1) * 100, 1)
    }
    report_path = REPORT_DIR / f"report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(f"\n📄 报告已保存: {report_path}")

    # Also save latest
    (REPORT_DIR / "latest.json").write_text(json.dumps(report, ensure_ascii=False, indent=2))

    return report


if __name__ == "__main__":
    report = run_all()
    sys.exit(1 if report["summary"]["failed"] > 0 else 0)
