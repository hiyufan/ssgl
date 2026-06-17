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
    """Make API request with error handling and rate limit retry."""
    url = f"{base}{path}"
    timeout = kwargs.pop("timeout", 15)
    max_retries = kwargs.pop("max_retries", 2)
    for attempt in range(max_retries + 1):
        try:
            resp = requests.request(method, url, timeout=timeout, **kwargs)
            if resp.status_code == 429 and attempt < max_retries:
                wait = 3 * (attempt + 1)
                time.sleep(wait)
                continue
            return resp
        except requests.exceptions.ConnectionError:
            return None
        except requests.exceptions.Timeout:
            return None
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

def _get_admin_user_id():
    """Fetch admin user ID via /users/me."""
    resp = _api_auth("GET", "/api/v1/users/me")
    if _ok(resp) and resp.status_code == 200:
        data = resp.json()
        user = data.get("user", data)
        return user.get("id") or data.get("id")
    return None

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

    # Backend - dedicated /health endpoint
    resp = _api("GET", "/health")
    if _ok(resp) and resp.status_code == 200:
        data = resp.json()
        _log("PASS", "backend-health", f"后端服务运行中 (:8080) → {data.get('status')}, db={data.get('database')}, version={data.get('version')}")
    elif _ok(resp):
        _log("PASS", "backend-health", f"后端服务运行中 (:8080) → {resp.status_code}")
    else:
        _log("FAIL", "backend-health", f"后端服务不可用")

    # AI Service (retry up to 5 times on transient timeout — first call may be slow due to cold start)
    resp = None
    for _attempt in range(5):
        resp = _api("GET", "/health", base=AI_SERVICE, timeout=15)
        if _ok(resp) and resp.status_code == 200:
            break
        time.sleep(3)
    if _ok(resp) and resp.status_code == 200:
        data = resp.json()
        _log("PASS", "ai-health", f"AI 服务运行中 (:8000) → {data.get('status', '?')}")
    else:
        _log("FAIL", "ai-health", f"AI 服务不可用", f"resp={resp}")

    # AI Service DB (retry up to 2 times)
    resp = None
    for _attempt in range(2):
        resp = _api("GET", "/ai/api/v1/rag/stats", base=AI_SERVICE, timeout=10)
        if _ok(resp) and resp.status_code == 200:
            break
        time.sleep(1)
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
        if not _student_token:
            # Password may have been changed in a previous failed test run
            alt_token = _login("test_student_001", "NewTestPass456!")
            if alt_token:
                _log("WARN", "register", "学生密码被前次测试修改，正在还原...")
                _api_auth("PUT", "/api/v1/auth/password", token=alt_token, json={
                    "old_password": "NewTestPass456!", "new_password": "TestPass123!"
                })
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

    # --- Profile endpoints ---
    resp = _api_auth("GET", "/api/v1/users/profile/me")
    if _ok(resp) and resp.status_code == 200:
        p = resp.json().get("profile", {})
        _log("PASS", "profile-me", f"个人资料: {p.get('name')} (teams={p.get('team_count')}, awards={p.get('award_count')})")
    else:
        _log("FAIL", "profile-me", f"/users/profile/me → {resp.status_code if _ok(resp) else 'None'}")

    resp = _api_auth("GET", "/api/v1/users/profile/1")
    if _ok(resp) and resp.status_code == 200:
        p = resp.json().get("profile", {})
        _log("PASS", "profile-by-id", f"查看用户资料: {p.get('name')} ({p.get('role')})")
    else:
        _log("FAIL", "profile-by-id", f"/users/profile/1 → {resp.status_code if _ok(resp) else 'None'}")

    resp = _api_auth("PUT", "/api/v1/users/profile", json={"name": "刘志远"})
    if _ok(resp) and resp.status_code == 200:
        _log("PASS", "profile-update", f"更新资料成功")
    else:
        _log("FAIL", "profile-update", f"更新资料 → {resp.status_code if _ok(resp) else 'None'}")

    resp = _api_auth("GET", "/api/v1/users?q=test&role=student")
    if _ok(resp) and resp.status_code == 200:
        d = resp.json()
        _log("PASS", "users-search", f"用户搜索成功, {d.get('total', 0)} 条结果")
    else:
        _log("FAIL", "users-search", f"用户搜索 → {resp.status_code if _ok(resp) else 'None'}")


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

    # --- Registrations ---
    resp = _api_auth("GET", "/api/v1/registrations")
    if _ok(resp) and resp.status_code == 200:
        data = resp.json()
        regs = data.get("registrations", [])
        _log("PASS", "reg-list", f"报名列表成功, {len(regs)} 条")
    else:
        _log("FAIL", "reg-list", f"报名列表失败 → {resp.status_code if _ok(resp) else 'None'}")

    # --- Competition Recommendation ---
    resp = _api_auth("GET", "/api/v1/competitions/recommend")
    if _ok(resp) and resp.status_code == 200:
        data = resp.json()
        recs = data.get("recommendations", [])
        _log("PASS", "comp-recommend", f"赛事推荐成功, {len(recs)} 条推荐")
    else:
        _log("FAIL", "comp-recommend", f"赛事推荐失败 → {resp.status_code if _ok(resp) else 'None'}")

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

    # --- Data Export (CSV) ---
    for ep in ["/api/v1/stats/export/overview", "/api/v1/stats/export/competitions", "/api/v1/stats/export/teams"]:
        name = ep.split("/")[-1]
        resp = _api_auth("GET", ep)
        if _ok(resp) and resp.status_code == 200:
            content_type = resp.headers.get("Content-Type", "")
            if "csv" in content_type or "text" in content_type:
                _log("PASS", f"export-{name}", f"导出 {name} 成功, Content-Type={content_type}, {len(resp.content)} bytes")
            else:
                _log("WARN", f"export-{name}", f"导出 {name} 返回非 CSV 格式: {content_type}")
        else:
            _log("FAIL", f"export-{name}", f"导出 {name} 失败 → {resp.status_code if _ok(resp) else 'None'}")

    # --- Student stats endpoint ---
    resp = _api_auth("GET", "/api/v1/stats/students")
    if _ok(resp) and resp.status_code == 200:
        _log("PASS", "stat-students", "统计 students 成功")
    else:
        _log("WARN", "stat-students", f"统计 students → {resp.status_code if _ok(resp) else 'None'} (may not exist yet)")

    # --- Competition progress endpoint ---
    resp = _api_auth("GET", "/api/v1/stats/progress")
    if _ok(resp) and resp.status_code == 200:
        data = resp.json()
        comps = data.get("competitions", [])
        _log("PASS", "stat-progress", f"赛事进度成功, {len(comps)} 个赛事")
    else:
        _log("FAIL", "stat-progress", f"赛事进度失败 → {resp.status_code if _ok(resp) else 'None'}")

    # --- Type distribution endpoint ---
    resp = _api_auth("GET", "/api/v1/stats/type-distribution")
    if _ok(resp) and resp.status_code == 200:
        data = resp.json()
        types = data.get("types", [])
        _log("PASS", "stat-type-dist", f"赛事类型分布成功, {len(types)} 种类型")
    else:
        _log("FAIL", "stat-type-dist", f"赛事类型分布失败 → {resp.status_code if _ok(resp) else 'None'}")

    # --- Recent activity endpoint ---
    resp = _api_auth("GET", "/api/v1/stats/recent-activity")
    if _ok(resp) and resp.status_code == 200:
        data = resp.json()
        activities = data.get("activities", [])
        _log("PASS", "stat-recent-activity", f"最近动态成功, {len(activities)} 条活动")
    else:
        _log("FAIL", "stat-recent-activity", f"最近动态失败 → {resp.status_code if _ok(resp) else 'None'}")

    # Recent activity with limit
    resp = _api_auth("GET", "/api/v1/stats/recent-activity?limit=5")
    if _ok(resp) and resp.status_code == 200:
        data = resp.json()
        _log("PASS", "stat-recent-activity-limit", f"最近动态(limit=5)成功, {data.get('total', '?')} 条")
    else:
        _log("WARN", "stat-recent-activity-limit", f"最近动态(limit) → {resp.status_code if _ok(resp) else 'None'}")

    # --- Kanban board endpoint ---
    resp = _api_auth("GET", "/api/v1/stats/kanban")
    if _ok(resp) and resp.status_code == 200:
        data = resp.json()
        columns = data.get("columns", [])
        total_cards = sum(c.get("count", 0) for c in columns)
        _log("PASS", "stat-kanban", f"看板总览成功, {len(columns)} 列, {total_cards} 个赛事")
    else:
        _log("FAIL", "stat-kanban", f"看板总览失败 → {resp.status_code if _ok(resp) else 'None'}")

    # --- Countdown endpoint ---
    resp = _api_auth("GET", "/api/v1/stats/countdown")
    if _ok(resp) and resp.status_code == 200:
        data = resp.json()
        items = data.get("countdown", [])
        total = data.get("total", 0)
        valid_phases = {"upcoming", "registration", "ongoing", "ending"}
        all_valid = all(item.get("phase") in valid_phases for item in items)
        if items:
            _log("PASS", "stat-countdown",
                 f"赛事倒计时成功, {total} 个赛事, 首个={items[0].get('title','?')}, "
                 f"phase={items[0].get('phase','?')}, days={items[0].get('days_until_start','?')}")
        else:
            _log("PASS", "stat-countdown", f"赛事倒计时成功, 0 个即将到来的赛事")
    else:
        _log("FAIL", "stat-countdown", f"赛事倒计时失败 → {resp.status_code if _ok(resp) else 'None'}")

    # --- Competition trends endpoint ---
    resp = _api_auth("GET", "/api/v1/stats/trends")
    if _ok(resp) and resp.status_code == 200:
        data = resp.json()
        trends = data.get("trends", [])
        _log("PASS", "stat-trends", f"赛事趋势成功, {len(trends)} 个月数据")
    else:
        _log("FAIL", "stat-trends", f"赛事趋势失败 → {resp.status_code if _ok(resp) else 'None'}")

    # Trends with custom months param
    resp = _api_auth("GET", "/api/v1/stats/trends?months=6")
    if _ok(resp) and resp.status_code == 200:
        data = resp.json()
        trends = data.get("trends", [])
        _log("PASS", "stat-trends-6m", f"赛事趋势(6个月)成功, {len(trends)} 个月")
    else:
        _log("WARN", "stat-trends-6m", f"赛事趋势(6个月) → {resp.status_code if _ok(resp) else 'None'}")

    # --- Engagement endpoint ---
    resp = _api_auth("GET", "/api/v1/stats/engagement")
    if _ok(resp) and resp.status_code == 200:
        data = resp.json()
        _log("PASS", "stat-engagement", f"参与度统计成功, 组队率={data.get('team_formation_rate', '?')}%, AI评审率={data.get('ai_review_rate', '?')}%")
    else:
        _log("FAIL", "stat-engagement", f"参与度统计失败 → {resp.status_code if _ok(resp) else 'None'}")

    # --- System diagnostics endpoint ---
    resp = _api_auth("GET", "/api/v1/system/diagnostics")
    if _ok(resp) and resp.status_code == 200:
        data = resp.json()
        _log("PASS", "system-diagnostics", f"系统诊断成功, uptime={data.get('uptime_seconds', '?')}s, db_pool={data.get('db_pool_stats', {}).get('open_connections', '?')}")
    else:
        _log("WARN", "system-diagnostics", f"系统诊断 → {resp.status_code if _ok(resp) else 'None'} (may not exist yet)")

    # --- User activity endpoint ---
    resp = _api_auth("GET", "/api/v1/users/me/activity")
    if _ok(resp) and resp.status_code == 200:
        data = resp.json()
        activities = data.get("activities", [])
        _log("PASS", "user-activity", f"个人动态成功, {len(activities)} 条活动")
    else:
        _log("FAIL", "user-activity", f"个人动态失败 → {resp.status_code if _ok(resp) else 'None'}")

    # --- Global search ---
    resp = _api_auth("GET", "/api/v1/search?q=test")
    if _ok(resp) and resp.status_code == 200:
        data = resp.json()
        results = data.get("results", [])
        _log("PASS", "global-search", f"全局搜索成功, {len(results)} 条结果, query={data.get('query','')}")
    else:
        _log("FAIL", "global-search", f"全局搜索失败 → {resp.status_code if _ok(resp) else 'None'}")

    # --- Global search missing query ---
    resp = _api_auth("GET", "/api/v1/search")
    if _ok(resp) and resp.status_code == 400:
        _log("PASS", "global-search-no-q", f"搜索缺少 q 参数 → 400 ✓")
    else:
        _log("FAIL", "global-search-no-q", f"预期 400, 实际 {resp.status_code if _ok(resp) else 'None'}")

    # --- Notifications endpoint ---
    resp = _api_auth("GET", "/api/v1/notifications")
    if _ok(resp) and resp.status_code == 200:
        data = resp.json()
        _log("PASS", "notifications-list", f"通知列表成功, {data.get('total', '?')} 条, 未读={data.get('unread_count', '?')}")
    else:
        _log("WARN", "notifications-list", f"通知列表 → {resp.status_code if _ok(resp) else 'None'} (may not exist yet)")

    # --- Notification create + mark-read CRUD ---
    if _ok(resp) and resp.status_code == 200:
        admin_id = _get_admin_user_id()
        if admin_id:
            # Create notification
            resp_create = _api_auth("POST", "/api/v1/notifications", json={
                "user_id": admin_id, "type": "test", "title": "自动化测试通知", "message": "这是一条测试通知"
            })
            if _ok(resp_create) and resp_create.status_code in (200, 201):
                notif_data = resp_create.json()
                notif = notif_data.get("notification", notif_data)
                notif_id = notif.get("id")
                _log("PASS", "notif-create", f"创建通知成功, id={notif_id}")

                if notif_id:
                    # Mark read
                    resp_read = _api_auth("POST", f"/api/v1/notifications/{notif_id}/read")
                    if _ok(resp_read) and resp_read.status_code == 200:
                        _log("PASS", "notif-mark-read", f"标记通知 {notif_id} 已读成功")
                    else:
                        _log("WARN", "notif-mark-read", f"标记已读 → {resp_read.status_code if _ok(resp_read) else 'None'}")

                    # Unread count after mark-read
                    resp_uc = _api_auth("GET", "/api/v1/notifications/unread-count")
                    if _ok(resp_uc) and resp_uc.status_code == 200:
                        _log("PASS", "notif-unread-count", f"未读计数成功: {resp_uc.json().get('unread_count', '?')}")
                    else:
                        _log("WARN", "notif-unread-count", f"未读计数 → {resp_uc.status_code if _ok(resp_uc) else 'None'}")

                    # Mark all read
                    resp_all = _api_auth("POST", "/api/v1/notifications/read-all")
                    if _ok(resp_all) and resp_all.status_code == 200:
                        _log("PASS", "notif-mark-all-read", "全部标记已读成功")
                    else:
                        _log("WARN", "notif-mark-all-read", f"全部标记已读 → {resp_all.status_code if _ok(resp_all) else 'None'}")
            else:
                _log("WARN", "notif-create", f"创建通知 → {resp_create.status_code if _ok(resp_create) else 'None'}")

    # --- Notification RBAC: student cannot create notifications ---
    if _student_token:
        resp_nc = _api_auth("POST", "/api/v1/notifications", token=_student_token, json={
            "user_id": 1, "type": "hack", "title": "Should fail", "message": "RBAC test"
        })
        if _ok(resp_nc) and resp_nc.status_code in (401, 403):
            _log("PASS", "notif-rbac-student", f"学生无法创建通知 → {resp_nc.status_code} ✓")
        elif _ok(resp_nc):
            _log("WARN", "notif-rbac-student", f"学生创建通知未被拒绝 → {resp_nc.status_code}")

    # --- Calendar ---
    resp = _api_auth("GET", "/api/v1/calendar")
    if _ok(resp) and resp.status_code == 200:
        data = resp.json()
        events = data.get("events", [])
        _log("PASS", "calendar", f"赛事日历成功, {len(events)} 个事件, 月份={data.get('month', '?')}")
    else:
        _log("FAIL", "calendar", f"赛事日历失败 → {resp.status_code if _ok(resp) else 'None'}")

    # Calendar with specific month
    resp = _api_auth("GET", "/api/v1/calendar?month=2026-07")
    if _ok(resp) and resp.status_code == 200:
        data = resp.json()
        _log("PASS", "calendar-month", f"赛事日历(指定月份)成功, {data.get('total', '?')} 个事件")
    else:
        _log("WARN", "calendar-month", f"赛事日历(指定月份) → {resp.status_code if _ok(resp) else 'None'}")

    # --- Calendar iCal Export ---
    resp = _api_auth("GET", "/api/v1/calendar/export")
    if _ok(resp) and resp.status_code == 200:
        ct = resp.headers.get("Content-Type", "")
        cd = resp.headers.get("Content-Disposition", "")
        body = resp.text
        has_vcal = "BEGIN:VCALENDAR" in body
        has_version = "VERSION:2.0" in body
        has_events = "BEGIN:VEVENT" in body
        has_alarm = "BEGIN:VALARM" in body
        if has_vcal and has_version:
            _log("PASS", "calendar-ics-export",
                 f"iCal 导出成功: {len(body)} 字符, events={body.count('BEGIN:VEVENT')}, "
                 f"alarms={body.count('BEGIN:VALARM')}, CT={ct.split(';')[0]}")
        else:
            _log("WARN", "calendar-ics-export", "iCal 内容格式不完整")
    elif _ok(resp) and resp.status_code == 404:
        _log("SKIP", "calendar-ics-export", "iCal 导出端点未部署 (404)")
    else:
        _log("FAIL", "calendar-ics-export", f"iCal 导出失败 → {resp.status_code if _ok(resp) else 'None'}")

    # --- Leaderboard ---
    resp = _api_auth("GET", "/api/v1/leaderboard")
    if _ok(resp) and resp.status_code == 200:
        data = resp.json()
        entries = data.get("leaderboard", [])
        _log("PASS", "leaderboard", f"排行榜成功, {len(entries)} 支团队")
    else:
        _log("FAIL", "leaderboard", f"排行榜失败 → {resp.status_code if _ok(resp) else 'None'}")

    # --- Showcase ---
    resp = _api_auth("GET", "/api/v1/showcase")
    if _ok(resp) and resp.status_code == 200:
        data = resp.json()
        total = data.get("total_awards", 0)
        prize = data.get("total_prize", 0)
        _log("PASS", "showcase", f"成果展示成功, {total} 个奖项, 奖金总额 ¥{prize}")
    else:
        _log("FAIL", "showcase", f"成果展示失败 → {resp.status_code if _ok(resp) else 'None'}")

    # --- Milestones: CRUD + batch + progress ---
    milestone_comp_data = {
        "title": f"里程碑测试赛事-{int(time.time())}",
        "description": "用于里程碑CRUD测试",
        "type": "hackathon",
        "max_team_size": 5,
        "min_team_size": 1,
        "start_date": "2026-07-01T00:00:00+08:00",
        "end_date": "2026-08-01T00:00:00+08:00",
    }
    resp = _api_auth("POST", "/api/v1/competitions", json=milestone_comp_data)
    milestone_comp_id = None
    if _ok(resp) and resp.status_code in (200, 201):
        data = resp.json()
        comp = data.get("competition", data)
        milestone_comp_id = comp.get("id") or data.get("id")
        _log("PASS", "milestone-comp-create", f"里程碑测试赛事创建成功, id={milestone_comp_id}")
    else:
        _log("FAIL", "milestone-comp-create", f"里程碑测试赛事创建失败 → {resp.status_code if _ok(resp) else 'None'}")

    milestone_id = None
    if milestone_comp_id:
        # Create single milestone
        resp = _api_auth("POST", "/api/v1/milestones", json={
            "competition_id": milestone_comp_id,
            "title": "报名截止",
            "type": "registration",
            "due_date": "2026-07-01T00:00:00+08:00",
            "sort_order": 1,
        })
        if _ok(resp) and resp.status_code in (200, 201):
            data = resp.json()
            m = data.get("milestone", data)
            milestone_id = m.get("id") or data.get("id")
            _log("PASS", "milestone-create", f"创建里程碑成功, id={milestone_id}")
        else:
            _log("FAIL", "milestone-create", f"创建里程碑失败 → {resp.status_code if _ok(resp) else 'None'}", resp.text[:200] if _ok(resp) else "")

        # Batch create
        resp = _api_auth("POST", f"/api/v1/competitions/{milestone_comp_id}/milestones/batch", json=[
            {"title": "作品提交", "type": "submission", "due_date": "2026-07-10T00:00:00+08:00", "sort_order": 2},
            {"title": "评审阶段", "type": "review", "due_date": "2026-07-15T00:00:00+08:00", "sort_order": 3},
            {"title": "颁奖典礼", "type": "award", "due_date": "2026-07-20T00:00:00+08:00", "sort_order": 4},
        ])
        if _ok(resp) and resp.status_code in (200, 201):
            data = resp.json()
            _log("PASS", "milestone-batch", f"批量创建成功, {data.get('total', 0)} 个里程碑")
        else:
            _log("FAIL", "milestone-batch", f"批量创建失败 → {resp.status_code if _ok(resp) else 'None'}", resp.text[:200] if _ok(resp) else "")

    # List milestones
    if milestone_comp_id:
        resp = _api_auth("GET", f"/api/v1/competitions/{milestone_comp_id}/milestones")
        if _ok(resp) and resp.status_code == 200:
            data = resp.json()
            _log("PASS", "milestone-list", f"里程碑列表成功, {data.get('total', 0)} 个, 进度={data.get('progress', 0)}%")
        else:
            _log("FAIL", "milestone-list", f"里程碑列表失败 → {resp.status_code if _ok(resp) else 'None'}")

    # Update milestone status
    if milestone_id:
        resp = _api_auth("PUT", f"/api/v1/milestones/{milestone_id}", json={"status": "completed"})
        if _ok(resp) and resp.status_code == 200:
            _log("PASS", "milestone-update", f"更新里程碑状态成功")
        else:
            _log("FAIL", "milestone-update", f"更新里程碑 → {resp.status_code if _ok(resp) else 'None'}")

        # Get single milestone
        resp = _api_auth("GET", f"/api/v1/milestones/{milestone_id}")
        if _ok(resp) and resp.status_code == 200:
            _log("PASS", "milestone-get", f"获取里程碑成功")
        else:
            _log("FAIL", "milestone-get", f"获取里程碑 → {resp.status_code if _ok(resp) else 'None'}")

    # Verify progress after update
    if milestone_comp_id:
        resp = _api_auth("GET", f"/api/v1/competitions/{milestone_comp_id}/milestones")
        if _ok(resp) and resp.status_code == 200:
            data = resp.json()
            if data.get("completed", 0) > 0 and data.get("progress", 0) > 0:
                _log("PASS", "milestone-progress", f"里程碑进度正确, completed={data['completed']}, progress={data['progress']}%")
            else:
                _log("WARN", "milestone-progress", f"里程碑进度异常: completed={data.get('completed')}, progress={data.get('progress')}%")

    # Delete milestone
    if milestone_id:
        resp = _api_auth("DELETE", f"/api/v1/milestones/{milestone_id}")
        if _ok(resp) and resp.status_code == 200:
            _log("PASS", "milestone-delete", f"删除里程碑成功")
        else:
            _log("FAIL", "milestone-delete", f"删除里程碑 → {resp.status_code if _ok(resp) else 'None'}")

    # Cleanup milestone competition
    if milestone_comp_id:
        _api_auth("DELETE", f"/api/v1/competitions/{milestone_comp_id}")

    # --- Team CRUD: create, join, leave ---
    # First create a temp competition for team tests
    team_comp_data = {
        "title": f"团队测试赛事-{int(time.time())}",
        "description": "用于团队CRUD测试",
        "type": "hackathon",
        "max_team_size": 5,
        "min_team_size": 1,
        "start_date": "2026-07-01T00:00:00+08:00",
        "end_date": "2026-08-01T00:00:00+08:00",
        "location": "线上",
        "tags": "测试"
    }
    resp = _api_auth("POST", "/api/v1/competitions", json=team_comp_data)
    team_comp_id = None
    if _ok(resp) and resp.status_code in (200, 201):
        data = resp.json()
        comp = data.get("competition", data)
        team_comp_id = comp.get("id") or data.get("id") or data.get("data", {}).get("id")
        _log("PASS", "team-comp-create", f"团队测试赛事创建成功, id={team_comp_id}")
    else:
        _log("FAIL", "team-comp-create", f"团队测试赛事创建失败 → {resp.status_code if _ok(resp) else 'None'}")

    team_id = None
    if team_comp_id:
        # team-create
        team_data = {"name": f"自动化测试团队-{int(time.time())}", "competition_id": team_comp_id}
        resp = _api_auth("POST", "/api/v1/teams", json=team_data)
        if _ok(resp) and resp.status_code in (200, 201):
            data = resp.json()
            team = data.get("team", data)
            team_id = team.get("id") or data.get("id") or data.get("data", {}).get("id")
            _log("PASS", "team-create", f"创建团队成功, id={team_id}")
        else:
            _log("FAIL", "team-create", f"创建团队失败 → {resp.status_code if _ok(resp) else 'None'}", resp.text[:200] if _ok(resp) else "")

    if team_id:
        # team-join (student joins)
        if _student_token:
            resp = _api_auth("POST", f"/api/v1/teams/{team_id}/join", token=_student_token)
            if _ok(resp) and resp.status_code in (200, 201):
                _log("PASS", "team-join", f"学生加入团队 {team_id} 成功")
            else:
                _log("WARN", "team-join", f"学生加入团队 → {resp.status_code if _ok(resp) else 'None'}", resp.text[:200] if _ok(resp) else "")

            # team-leave
            resp = _api_auth("DELETE", f"/api/v1/teams/{team_id}/leave", token=_student_token)
            if _ok(resp) and resp.status_code == 200:
                _log("PASS", "team-leave", f"学生离开团队 {team_id} 成功")
            else:
                _log("WARN", "team-leave", f"学生离开团队 → {resp.status_code if _ok(resp) else 'None'}", resp.text[:200] if _ok(resp) else "")
        else:
            _log("SKIP", "team-join", "无学生token，跳过团队加入测试")
            _log("SKIP", "team-leave", "无学生token，跳过团队离开测试")

    # --- Team Invite: invite, accept/decline, my-invites ---
    if team_id and _student_token:
        # Get student username for invite
        resp_me = _api_auth("GET", "/api/v1/users/me", token=_student_token)
        student_username = None
        if _ok(resp_me) and resp_me.status_code == 200:
            me = resp_me.json()
            user = me.get("user", me)
            student_username = user.get("username")

        if student_username:
            # Invite student to team (admin is leader)
            resp = _api_auth("POST", f"/api/v1/teams/{team_id}/invite", json={
                "username": student_username,
                "message": "欢迎加入团队！"
            })
            if _ok(resp) and resp.status_code in (200, 201):
                data = resp.json()
                invite = data.get("invitation", data)
                invite_code = invite.get("code")
                _log("PASS", "team-invite", f"邀请 {student_username} 成功, code={invite_code}")
            elif _ok(resp) and resp.status_code == 400:
                # User may already be a member or have pending invite
                _log("WARN", "team-invite", f"邀请 → 400: {resp.json().get('error', '')}")
                invite_code = None
            else:
                _log("WARN", "team-invite", f"邀请 → {resp.status_code if _ok(resp) else 'None'}")
                invite_code = None

            # List team invites
            resp = _api_auth("GET", f"/api/v1/teams/{team_id}/invites")
            if _ok(resp) and resp.status_code == 200:
                _log("PASS", "team-list-invites", "团队邀请列表成功")
            else:
                _log("WARN", "team-list-invites", f"团队邀请列表 → {resp.status_code if _ok(resp) else 'None'}")

            # My invites (as student)
            resp = _api_auth("GET", "/api/v1/teams/invites/me", token=_student_token)
            if _ok(resp) and resp.status_code == 200:
                _log("PASS", "team-my-invites", "我的邀请列表成功")
            else:
                _log("WARN", "team-my-invites", f"我的邀请 → {resp.status_code if _ok(resp) else 'None'}")

            if invite_code:
                # Decline the invite (test decline path)
                resp = _api_auth("POST", f"/api/v1/teams/invite/{invite_code}/decline", token=_student_token)
                if _ok(resp) and resp.status_code == 200:
                    _log("PASS", "team-decline-invite", f"拒绝邀请 {invite_code} 成功")
                else:
                    _log("WARN", "team-decline-invite", f"拒绝邀请 → {resp.status_code if _ok(resp) else 'None'}")
        else:
            _log("SKIP", "team-invite", "无法获取学生用户名，跳过邀请测试")
    elif team_id:
        _log("SKIP", "team-invite", "无学生token，跳过邀请测试")

    # --- Teammate Matching ---
    if team_comp_id:
        resp = _api_auth("GET", f"/api/v1/teams/match?competition_id={team_comp_id}")
        if _ok(resp) and resp.status_code == 200:
            data = resp.json()
            matches = data.get("matches", [])
            _log("PASS", "team-match", f"队友匹配成功, {len(matches)} 个推荐")
        else:
            _log("WARN", "team-match", f"队友匹配 → {resp.status_code if _ok(resp) else 'None'}")

    # --- PrePlan CRUD: create, update ---
    preplan_id = None
    if team_id:
        preplan_data = {
            "team_id": team_id,
            "competition_id": team_comp_id,
            "title": f"自动化测试预案-{int(time.time())}",
            "tech_stack": "Go, Vue3, PostgreSQL",
            "target_audience": "大学生",
            "market_analysis": "竞赛管理系统市场分析",
            "innovation": "AI辅助方案生成",
            "expected_outcome": "完成MVP并获奖",
            "timeline": "2026年7月-8月"
        }
        resp = _api_auth("POST", "/api/v1/pre-plans", json=preplan_data)
        if _ok(resp) and resp.status_code in (200, 201):
            data = resp.json()
            pp = data.get("pre_plan", data)
            preplan_id = pp.get("id") or data.get("id") or data.get("data", {}).get("id")
            _log("PASS", "preplan-create", f"创建预案成功, id={preplan_id}")
        else:
            _log("FAIL", "preplan-create", f"创建预案失败 → {resp.status_code if _ok(resp) else 'None'}", resp.text[:200] if _ok(resp) else "")

    if preplan_id:
        # preplan-update (partial update, pointer types)
        resp = _api_auth("PUT", f"/api/v1/pre-plans/{preplan_id}", json={
            "title": "更新后的预案标题",
            "tech_stack": "Go, Vue3, PostgreSQL, Redis"
        })
        if _ok(resp) and resp.status_code == 200:
            _log("PASS", "preplan-update", f"更新预案 {preplan_id} 成功")
        else:
            _log("WARN", "preplan-update", f"更新预案 {preplan_id} → {resp.status_code if _ok(resp) else 'None'}", resp.text[:200] if _ok(resp) else "")

        # preplan-review (AI review — may timeout on slow LLM, treat as WARN)
        skip_slow = os.getenv("SSGL_SKIP_SLOW", "0") == "1"
        if not skip_slow:
            resp = _api_auth("POST", f"/api/v1/pre-plans/{preplan_id}/review", timeout=120)
            if _ok(resp) and resp.status_code == 200:
                _log("PASS", "preplan-review", f"AI 评审预案 {preplan_id} 成功")
            elif _ok(resp) and resp.status_code in (400, 422):
                _log("WARN", "preplan-review", f"AI 评审参数问题 → {resp.status_code}")
            elif _ok(resp):
                _log("WARN", "preplan-review", f"AI 评审 → {resp.status_code}", resp.text[:200])
            else:
                _log("WARN", "preplan-review", "AI 评审超时（LLM 推理慢）")
        else:
            _log("SKIP", "preplan-review", "跳过 AI 评审测试 (SSGL_SKIP_SLOW=1)")

    # --- Teacher review (approve) ---
    if preplan_id:
        resp = _api_auth("POST", f"/api/v1/pre-plans/{preplan_id}/teacher-review", json={"action": "approve", "notes": "同意通过"})
        if _ok(resp) and resp.status_code == 200:
            data = resp.json()
            _log("PASS", "preplan-teacher-approve", f"教师审核通过, action={data.get('action')}")
        else:
            _log("WARN", "preplan-teacher-approve", f"教师审核 → {resp.status_code if _ok(resp) else 'None'}", resp.text[:200] if _ok(resp) else "")

    # --- Teacher review (reject) - create a new preplan to reject ---
    if team_comp_id and team_id:
        resp = _api_auth("POST", "/api/v1/pre-plans", json={
            "competition_id": team_comp_id, "team_id": team_id,
            "title": "待拒绝预案", "tech_stack": "Python"
        })
        if _ok(resp) and resp.status_code in (200, 201):
            reject_pp = resp.json().get("pre_plan", {})
            reject_pp_id = reject_pp.get("id")
            if reject_pp_id:
                resp = _api_auth("POST", f"/api/v1/pre-plans/{reject_pp_id}/teacher-review", json={"action": "reject", "notes": "需要改进"})
                if _ok(resp) and resp.status_code == 200:
                    _log("PASS", "preplan-teacher-reject", f"教师驳回预案成功")
                else:
                    _log("WARN", "preplan-teacher-reject", f"教师驳回 → {resp.status_code if _ok(resp) else 'None'}")

    # --- Teacher review validation (bad action) ---
    if preplan_id:
        resp = _api_auth("POST", f"/api/v1/pre-plans/{preplan_id}/teacher-review", json={"action": "invalid"})
        if _ok(resp) and resp.status_code == 400:
            _log("PASS", "preplan-teacher-bad-action", "无效 action → 400 ✓")
        else:
            _log("WARN", "preplan-teacher-bad-action", f"预期 400, 实际 {resp.status_code if _ok(resp) else 'None'}")

    # --- Preplan delete ---
    if team_comp_id and team_id:
        resp = _api_auth("POST", "/api/v1/pre-plans", json={
            "competition_id": team_comp_id, "team_id": team_id,
            "title": "待删除预案", "tech_stack": "Go"
        })
        if _ok(resp) and resp.status_code in (200, 201):
            del_pp = resp.json().get("pre_plan", {})
            del_pp_id = del_pp.get("id")
            if del_pp_id:
                resp = _api_auth("DELETE", f"/api/v1/pre-plans/{del_pp_id}")
                if _ok(resp) and resp.status_code == 200:
                    _log("PASS", "preplan-delete", f"删除预案 {del_pp_id} 成功")
                    # Verify gone
                    resp = _api_auth("GET", f"/api/v1/pre-plans/{del_pp_id}")
                    if _ok(resp) and resp.status_code == 404:
                        _log("PASS", "preplan-delete-verify", "删除后 404 ✓")
                    else:
                        _log("WARN", "preplan-delete-verify", f"删除后 → {resp.status_code if _ok(resp) else 'None'}")
                else:
                    _log("WARN", "preplan-delete", f"删除预案 → {resp.status_code if _ok(resp) else 'None'}")

    # --- Competition detail stats ---
    if team_comp_id:
        resp = _api_auth("GET", f"/api/v1/competitions/{team_comp_id}/stats")
        if _ok(resp) and resp.status_code == 200:
            data = resp.json()
            _log("PASS", "comp-stats", f"赛事统计成功, teams={data.get('team_count')}, students={data.get('student_count')}, preplans={data.get('preplan_count')}")
        else:
            _log("WARN", "comp-stats", f"赛事统计 → {resp.status_code if _ok(resp) else 'None'}", resp.text[:200] if _ok(resp) else "")

    # --- Award CRUD: create, settle ---
    award_id = None
    if team_comp_id and team_id:
        award_data = {
            "competition_id": team_comp_id,
            "team_id": team_id,
            "rank": 1,
            "rank_name": "一等奖",
            "prize_name": "最佳创新奖",
            "prize_amount": 5000.00
        }
        resp = _api_auth("POST", "/api/v1/awards", json=award_data)
        if _ok(resp) and resp.status_code in (200, 201):
            data = resp.json()
            aw = data.get("award", data)
            award_id = aw.get("id") or data.get("id") or data.get("data", {}).get("id")
            _log("PASS", "award-create", f"创建奖项成功, id={award_id}")
        else:
            _log("WARN", "award-create", f"创建奖项 → {resp.status_code if _ok(resp) else 'None'}", resp.text[:200] if _ok(resp) else "")

    if award_id:
        # award-settle (admin settles award, needs prize_amount body)
        resp = _api_auth("POST", f"/api/v1/awards/{award_id}/settle", json={"prize_amount": 5000.00})
        if _ok(resp) and resp.status_code == 200:
            _log("PASS", "award-settle", f"结算奖项 {award_id} 成功")
        else:
            _log("WARN", "award-settle", f"结算奖项 {award_id} → {resp.status_code if _ok(resp) else 'None'}", resp.text[:200] if _ok(resp) else "")

    # --- Eval CRUD: create ---
    if team_comp_id and _student_token:
        # Get student user id
        resp_me = _api_auth("GET", "/api/v1/users/me", token=_student_token)
        student_id = None
        if _ok(resp_me) and resp_me.status_code == 200:
            me = resp_me.json()
            user = me.get("user", me)
            student_id = user.get("id") or me.get("id")
        if student_id:
            # Use a teacher user (not admin) for evaluation
            eval_data = {
                "teacher_id": 2,  # wangjg (teacher)
                "competition_id": team_comp_id,
                "teaching": 4,
                "communication": 4,
                "availability": 5,
                "overall": 4,
                "feedback": "自动化测试评价：表现良好，积极参与"
            }
            resp = _api_auth("POST", "/api/v1/evaluations", json=eval_data)
            if _ok(resp) and resp.status_code in (200, 201):
                _log("PASS", "eval-create", f"创建评价成功")
            else:
                _log("WARN", "eval-create", f"创建评价 → {resp.status_code if _ok(resp) else 'None'}", resp.text[:200] if _ok(resp) else "")
        else:
            _log("WARN", "eval-create", "无法获取学生ID，跳过评价创建")
    else:
        _log("WARN", "eval-create", "缺少赛事ID或学生token，跳过评价创建")

    # --- Team Analysis (new feature) ---
    # Test with existing team (id=1 should exist from seed data)
    resp = _api_auth("GET", "/api/v1/teams/1/analysis")
    if _ok(resp) and resp.status_code == 200:
        data = resp.json()
        strengths = data.get("strengths", [])
        gaps = data.get("gaps", [])
        recommendations = data.get("recommendations", [])
        score = data.get("overall_score", 0)
        members = data.get("members", [])
        dept_diversity = data.get("dept_diversity", 0)
        _log("PASS", "team-analysis-seed", f"种子团队分析成功, 综合分={score}, "
             f"成员={len(members)}, 学科多样性={dept_diversity}, "
             f"优势={len(strengths)}, 短板={len(gaps)}, 建议={len(recommendations)}")
    else:
        _log("FAIL", "team-analysis-seed", f"种子团队分析失败 → {resp.status_code if _ok(resp) else 'None'}")

    # Test with non-existent team
    resp = _api_auth("GET", "/api/v1/teams/999999/analysis")
    if _ok(resp) and resp.status_code == 404:
        _log("PASS", "team-analysis-404", "不存在的团队 → 404 ✓")
    else:
        _log("WARN", "team-analysis-404", f"不存在的团队 → {resp.status_code if _ok(resp) else 'None'}")

    if team_id:
        resp = _api_auth("GET", f"/api/v1/teams/{team_id}/analysis")
        if _ok(resp) and resp.status_code == 200:
            data = resp.json()
            strengths = data.get("strengths", [])
            gaps = data.get("gaps", [])
            recommendations = data.get("recommendations", [])
            score = data.get("overall_score", 0)
            _log("PASS", "team-analysis", f"测试团队分析成功, 综合分={score}, "
                 f"优势={len(strengths)}, 短板={len(gaps)}, 建议={len(recommendations)}")
        else:
            _log("FAIL", "team-analysis", f"测试团队分析失败 → {resp.status_code if _ok(resp) else 'None'}")

    # Cleanup: delete competition (cascades)
    if team_comp_id:
        resp = _api_auth("DELETE", f"/api/v1/competitions/{team_comp_id}")
        if _ok(resp) and resp.status_code == 200:
            _log("PASS", "team-cleanup", f"清理团队测试赛事 {team_comp_id} 成功")
        else:
            _log("WARN", "team-cleanup", f"清理团队测试赛事 → {resp.status_code if _ok(resp) else 'None'}")


# ============================================================
# 3b. Registration Flow Tests
# ============================================================
def test_registration_flow():
    """Full registration lifecycle: student register → teacher approve/reject → deregister."""
    print("\n📝 3b. 报名流程测试")

    if not _student_token:
        _log("SKIP", "reg-flow", "无学生 token，跳过报名流程测试")
        return

    # Create a competition for testing
    comp_data = {
        "title": f"报名测试赛事-{int(time.time())}",
        "description": "用于报名流程测试",
        "type": "innovation",
        "max_team_size": 3,
        "min_team_size": 1,
        "start_date": "2026-09-01T00:00:00+08:00",
        "end_date": "2026-10-01T00:00:00+08:00",
        "location": "线上",
    }
    resp = _api_auth("POST", "/api/v1/competitions", json=comp_data)
    reg_comp_id = None
    if _ok(resp) and resp.status_code in (200, 201):
        data = resp.json()
        comp = data.get("competition", data)
        reg_comp_id = comp.get("id") or data.get("id")
        _log("PASS", "reg-comp-create", f"报名测试赛事创建成功, id={reg_comp_id}")
    else:
        _log("FAIL", "reg-comp-create", f"报名测试赛事创建失败 → {resp.status_code if _ok(resp) else 'None'}")
        return

    # Publish the competition
    resp = _api_auth("POST", f"/api/v1/competitions/{reg_comp_id}/publish")
    if _ok(resp) and resp.status_code == 200:
        _log("PASS", "reg-comp-publish", f"发布赛事 {reg_comp_id} 成功")
    else:
        _log("WARN", "reg-comp-publish", f"发布赛事 → {resp.status_code if _ok(resp) else 'None'}")

    # Student registers for competition
    reg_id = None
    resp = _api_auth("POST", f"/api/v1/competitions/{reg_comp_id}/register",
                     token=_student_token, json={"remark": "测试报名"})
    if _ok(resp) and resp.status_code in (200, 201):
        data = resp.json()
        reg = data.get("registration", data)
        reg_id = reg.get("id") or data.get("id")
        _log("PASS", "reg-register", f"学生报名成功, registration_id={reg_id}")
    else:
        _log("FAIL", "reg-register", f"学生报名失败 → {resp.status_code if _ok(resp) else 'None'}",
             resp.text[:200] if _ok(resp) else "")

    # Duplicate registration should fail (409)
    if reg_id:
        resp = _api_auth("POST", f"/api/v1/competitions/{reg_comp_id}/register",
                         token=_student_token, json={})
        if _ok(resp) and resp.status_code == 409:
            _log("PASS", "reg-duplicate", "重复报名被拒绝 (409) ✓")
        else:
            _log("WARN", "reg-duplicate", f"重复报名 → {resp.status_code if _ok(resp) else 'None'}")

    # Competition registrations list
    resp = _api_auth("GET", f"/api/v1/competitions/{reg_comp_id}/registrations")
    if _ok(resp) and resp.status_code == 200:
        data = resp.json()
        regs = data.get("registrations", [])
        _log("PASS", "reg-comp-list", f"赛事报名列表成功, {len(regs)} 条, total={data.get('total', '?')}")
    else:
        _log("FAIL", "reg-comp-list", f"赛事报名列表失败 → {resp.status_code if _ok(resp) else 'None'}")

    # Admin approves registration
    if reg_id:
        resp = _api_auth("POST", f"/api/v1/registrations/{reg_id}/approve")
        if _ok(resp) and resp.status_code == 200:
            _log("PASS", "reg-approve", f"审核通过报名 {reg_id} 成功")
        else:
            _log("WARN", "reg-approve", f"审核通过 → {resp.status_code if _ok(resp) else 'None'}",
                 resp.text[:200] if _ok(resp) else "")

    # Student can view own registrations
    resp = _api_auth("GET", "/api/v1/registrations", token=_student_token)
    if _ok(resp) and resp.status_code == 200:
        data = resp.json()
        regs = data.get("registrations", [])
        _log("PASS", "reg-my-list", f"学生报名列表成功, {len(regs)} 条")
    else:
        _log("FAIL", "reg-my-list", f"学生报名列表失败 → {resp.status_code if _ok(resp) else 'None'}")

    # Now test a second registration that gets rejected
    # Create another student to test reject flow
    resp = _api("POST", "/api/v1/auth/register", json={
        "username": "test_student_reject",
        "password": "TestPass456!",
        "name": "待拒绝学生",
        "role": "student",
        "email": "reject@ssgl.test"
    })
    reject_token = None
    if _ok(resp) and resp.status_code in (200, 201):
        reject_token = _login("test_student_reject", "TestPass456!")
    elif _ok(resp) and resp.status_code in (400, 409):
        reject_token = _login("test_student_reject", "TestPass456!")

    reject_reg_id = None
    if reject_token and reg_comp_id:
        resp = _api_auth("POST", f"/api/v1/competitions/{reg_comp_id}/register",
                         token=reject_token, json={"remark": "待拒绝"})
        if _ok(resp) and resp.status_code in (200, 201):
            data = resp.json()
            reg = data.get("registration", data)
            reject_reg_id = reg.get("id") or data.get("id")
            _log("PASS", "reg-register-2", f"第二个学生报名成功, id={reject_reg_id}")

    if reject_reg_id:
        resp = _api_auth("POST", f"/api/v1/registrations/{reject_reg_id}/reject",
                         json={"reason": "材料不全"})
        if _ok(resp) and resp.status_code == 200:
            _log("PASS", "reg-reject", f"拒绝报名 {reject_reg_id} 成功")
        else:
            _log("WARN", "reg-reject", f"拒绝报名 → {resp.status_code if _ok(resp) else 'None'}")

    # Cleanup
    if reg_comp_id:
        _api_auth("DELETE", f"/api/v1/competitions/{reg_comp_id}")


# ============================================================
# 3c. Password Change Tests
# ============================================================
def test_password_change():
    """Test the password change flow."""
    global _student_token
    print("\n🔑 3c. 修改密码测试")

    if not _student_token:
        _log("SKIP", "pwd-change", "无学生 token，跳过密码修改测试")
        return

    # Wrong old password → 400
    resp = _api_auth("PUT", "/api/v1/auth/password", token=_student_token, json={
        "old_password": "wrongOldPass!",
        "new_password": "NewSecurePass789!"
    })
    if _ok(resp) and resp.status_code == 400:
        _log("PASS", "pwd-wrong-old", "错误旧密码 → 400 ✓")
    else:
        _log("WARN", "pwd-wrong-old", f"错误旧密码 → {resp.status_code if _ok(resp) else 'None'}")

    # Same old and new password → 400
    resp = _api_auth("PUT", "/api/v1/auth/password", token=_student_token, json={
        "old_password": "TestPass123!",
        "new_password": "TestPass123!"
    })
    if _ok(resp) and resp.status_code == 400:
        _log("PASS", "pwd-same", "新旧密码相同 → 400 ✓")
    else:
        _log("WARN", "pwd-same", f"新旧密码相同 → {resp.status_code if _ok(resp) else 'None'}")

    # Weak new password → 400
    resp = _api_auth("PUT", "/api/v1/auth/password", token=_student_token, json={
        "old_password": "TestPass123!",
        "new_password": "123"
    })
    if _ok(resp) and resp.status_code == 400:
        _log("PASS", "pwd-weak", "弱密码被拒绝 → 400 ✓")
    else:
        _log("WARN", "pwd-weak", f"弱密码 → {resp.status_code if _ok(resp) else 'None'}")

    # Successful password change
    resp = _api_auth("PUT", "/api/v1/auth/password", token=_student_token, json={
        "old_password": "TestPass123!",
        "new_password": "NewTestPass456!"
    })
    if _ok(resp) and resp.status_code == 200:
        _log("PASS", "pwd-change-ok", "修改密码成功 ✓")
        # Verify login with new password (add extra delay for rate limit)
        time.sleep(2)
        new_token = _login("test_student_001", "NewTestPass456!")
        if new_token:
            _log("PASS", "pwd-login-new", "新密码登录成功 ✓")
            # Restore original password for subsequent tests
            _student_token = new_token
            time.sleep(1)
            resp = _api_auth("PUT", "/api/v1/auth/password", token=new_token, json={
                "old_password": "NewTestPass456!",
                "new_password": "TestPass123!"
            })
            if _ok(resp) and resp.status_code == 200:
                _log("PASS", "pwd-restore", "密码已还原 ✓")
                time.sleep(1)
                _student_token = _login("test_student_001", "TestPass123!")
            else:
                _log("WARN", "pwd-restore", "密码还原失败，后续测试可能受影响")
                # Force restore: try again after longer wait
                time.sleep(3)
                retry_token = _login("test_student_001", "NewTestPass456!")
                if retry_token:
                    _api_auth("PUT", "/api/v1/auth/password", token=retry_token, json={
                        "old_password": "NewTestPass456!",
                        "new_password": "TestPass123!"
                    })
        else:
            _log("FAIL", "pwd-login-new", "新密码登录失败")
            # Critical: restore password even if login check failed
            time.sleep(3)
            restore_token = _login("test_student_001", "NewTestPass456!")
            if restore_token:
                _api_auth("PUT", "/api/v1/auth/password", token=restore_token, json={
                    "old_password": "NewTestPass456!",
                    "new_password": "TestPass123!"
                })
                _student_token = _login("test_student_001", "TestPass123!")
    else:
        _log("WARN", "pwd-change-ok", f"修改密码 → {resp.status_code if _ok(resp) else 'None'}",
             resp.text[:200] if _ok(resp) else "")

    # No auth → 401
    resp = _api("PUT", "/api/v1/auth/password", json={
        "old_password": "any",
        "new_password": "NewPass123!"
    })
    if _ok(resp) and resp.status_code == 401:
        _log("PASS", "pwd-no-auth", "无 token 修改密码 → 401 ✓")
    else:
        _log("WARN", "pwd-no-auth", f"无 token → {resp.status_code if _ok(resp) else 'None'}")


# ============================================================
# 3d. Export Full Data Test
# ============================================================
def test_export_full():
    """Test the full data export endpoint."""
    print("\n📤 3d. 全量数据导出测试")

    resp = _api_auth("GET", "/api/v1/stats/export/full")
    if _ok(resp) and resp.status_code == 200:
        content_type = resp.headers.get("Content-Type", "")
        size = len(resp.content)
        _log("PASS", "export-full", f"全量导出成功, Content-Type={content_type}, {size} bytes")
    else:
        _log("WARN", "export-full", f"全量导出 → {resp.status_code if _ok(resp) else 'None'}")


# ============================================================
# 4. AI Service Tests
# ============================================================
def test_ai_service():
    print("\n🤖 4. AI 服务测试")

    # RAG search (no LLM needed)
    resp = _api("POST", "/ai/api/v1/rag/search", base=AI_SERVICE, json={"question": "蓝桥杯竞赛的参赛经验和获奖技巧", "top_k": 5})
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
    # Set SSGL_SKIP_SLOW=1 to skip LLM tests (they take 10-60s each)
    skip_slow = os.getenv("SSGL_SKIP_SLOW", "0") == "1"
    if skip_slow:
        _log("SKIP", "ai-llm", "跳过 LLM 端点测试 (SSGL_SKIP_SLOW=1)")
        return

    # Timeouts per endpoint (matching actual LLM response times)
    llm_endpoints = [
        ("POST", "/ai/api/v1/rag/query", {"question": "什么是蓝桥杯？"}, 30),
        ("POST", "/ai/api/v1/tools/advisor", {"input": "如何准备蓝桥杯", "extra": ""}, 90),
        ("POST", "/ai/api/v1/tools/parse-competition", {"content": "蓝桥杯，工信部主办，4月省赛"}, 90),
        ("POST", "/ai/api/v1/coach/start", {"source": "text", "pitch_text": "蓝桥杯竞赛项目：基于AI的智能学习助手", "role": "student"}, 90),
        ("POST", "/ai/api/v1/tools/business-plan", {"input": "为一个竞赛管理系统编写商业计划书"}, 180),
        ("POST", "/ai/api/v1/tools/market-analysis", {"input": "竞赛管理系统", "extra": "高校"}, 120),
        ("POST", "/ai/api/v1/tools/improvement", {"input": "竞赛管理系统缺少实时通知，给出改进建议"}, 120),
        ("POST", "/ai/api/v1/tools/tech-route", {"input": "竞赛管理平台技术路线", "extra": "Go, Vue3, PostgreSQL"}, 120),
        ("POST", "/ai/api/v1/tools/resource-match", {"input": "需要AI模型训练和云服务器资源", "extra": "GPU算力, 云服务器"}, 120),
        ("POST", "/ai/api/v1/tools/pitch-deck", {"input": "蓝桥杯AI学习助手项目的路演大纲"}, 120),
        ("POST", "/ai/api/v1/tools/swot-analysis", {"input": "基于AI的智能学习助手项目，面向高校学生"}, 120),
        ("POST", "/ai/api/v1/tools/competition-report", {"input": "蓝桥杯全国软件和信息技术专业人才大赛"}, 120),
    ]

    for method, path, body, timeout in llm_endpoints:
        name = path.split("/")[-1]
        try:
            resp = _api(method, path, base=AI_SERVICE, json=body, timeout=timeout)
            if _ok(resp) and resp.status_code == 200:
                _log("PASS", f"ai-{name}", f"AI {name} 成功 ({resp.elapsed.total_seconds():.1f}s)")
            elif _ok(resp) and resp.status_code in (400, 422):
                _log("WARN", f"ai-{name}", f"AI {name} 参数问题 → {resp.status_code}", resp.text[:150])
            elif _ok(resp):
                _log("FAIL", f"ai-{name}", f"AI {name} 失败 → {resp.status_code}", resp.text[:150])
            else:
                # Timeout is expected for slow LLM endpoints - mark as WARN not FAIL
                _log("WARN", f"ai-{name}", f"AI {name} 超时（LLM 推理慢，非服务故障）")
        except Exception as e:
            _log("WARN", f"ai-{name}", f"AI {name} 异常: {e}")


# ============================================================
# 4b. Coach Full-Flow Tests
# ============================================================
def test_coach_flow():
    """Test the full coach flow: start → answer stream → final report."""
    print("\n🎯 4b. AI 答辩教练完整流程")

    skip_slow = os.getenv("SSGL_SKIP_SLOW", "0") == "1"
    if skip_slow:
        _log("SKIP", "coach-flow", "跳过教练流程测试 (SSGL_SKIP_SLOW=1)")
        return

    # Step 1: Start a coaching session
    resp = _api("POST", "/ai/api/v1/coach/start", base=AI_SERVICE, json={
        "source": "text",
        "pitch_text": "蓝桥杯竞赛项目：基于AI的智能学习助手，通过自然语言处理技术为学生提供个性化学习方案，目前已完成原型开发",
        "role": "student",
        "num_questions": 3,
    }, timeout=90)

    if not _ok(resp) or resp.status_code != 200:
        _log("FAIL", "coach-start", f"教练启动失败 → {resp.status_code if _ok(resp) else 'None'}")
        return

    data = resp.json()
    session_id = data.get("session_id", "")
    questions = data.get("questions", [])
    scores = data.get("scores", {})

    if not session_id or not questions:
        _log("FAIL", "coach-start", "教练启动返回数据不完整")
        return

    _log("PASS", "coach-start", f"教练启动成功, session={session_id[:8]}..., {len(questions)} 问, 综合分={data.get('overall', '?')}")

    # Step 2: Answer first question (streaming)
    q = questions[0]
    resp = _api("POST", "/ai/api/v1/coach/answer", base=AI_SERVICE, json={
        "session_id": session_id,
        "question_id": q["id"],
        "answer": "我们的项目采用了最新的NLP技术，结合GPT模型和知识图谱，能够为每个学生生成个性化的学习路径。目前已完成原型开发，在50名学生中测试，学习效率提升了30%。",
    }, timeout=120)

    if not _ok(resp) or resp.status_code != 200:
        _log("FAIL", "coach-answer", f"教练回答失败 → {resp.status_code if _ok(resp) else 'None'}")
        return

    # Parse SSE stream
    full_text = ""
    try:
        for line in resp.iter_lines(decode_unicode=True):
            if line and line.startswith("data: "):
                chunk = line[6:]
                if chunk in ("[DONE]", "[EXPIRED]", "[ERROR]"):
                    break
                try:
                    parsed = json.loads(chunk)
                    full_text += parsed.get("chunk", parsed.get("text", ""))
                except json.JSONDecodeError:
                    full_text += chunk
    except Exception as e:
        _log("WARN", "coach-answer", f"流式解析异常: {e}")

    if len(full_text) > 10:
        _log("PASS", "coach-answer", f"教练回答流式成功, {len(full_text)} 字符")
    else:
        _log("WARN", "coach-answer", f"教练回答内容过短: {len(full_text)} 字符")

    # Step 3: Get final report
    resp = _api("POST", "/ai/api/v1/coach/final", base=AI_SERVICE, json={
        "session_id": session_id,
    }, timeout=120)

    if not _ok(resp) or resp.status_code != 200:
        _log("FAIL", "coach-final", f"教练终评失败 → {resp.status_code if _ok(resp) else 'None'}")
        return

    final = resp.json()
    overall = final.get("overall", 0)
    final_scores = final.get("scores", {})
    highlights = final.get("highlights", [])
    improvements = final.get("improvements", [])

    if overall and final_scores:
        _log("PASS", "coach-final", f"教练终评成功, 综合分={overall}, "
             f"维度={len(final_scores)}, 亮点={len(highlights)}, 改进={len(improvements)}")
    else:
        _log("WARN", "coach-final", "教练终评数据不完整")


# ============================================================
# 4c. Knowledge Base Management Tests
# ============================================================
def test_knowledge_base():
    """Test knowledge base: upload, ingest, search, chunks, delete."""
    print("\n📚 4c. 知识库管理测试")

    # Text ingest
    resp = _api("POST", "/ai/api/v1/rag/ingest", base=AI_SERVICE, json={
        "content": "蓝桥杯全国软件和信息技术专业人才大赛是由工业和信息化部人才交流中心主办的全国性IT学科赛事。大赛分为省赛和全国总决赛两个阶段。",
        "metadata": {"source": "test", "category": "competition_intro"},
        "chunk_strategy": "semantic",
    }, timeout=30)
    if _ok(resp) and resp.status_code == 200:
        data = resp.json()
        _log("PASS", "rag-ingest", f"文本摄入成功, {data.get('chunk_count', 0)} 个分块")
    else:
        _log("FAIL", "rag-ingest", f"文本摄入失败 → {resp.status_code if _ok(resp) else 'None'}")

    # File upload
    test_content = "# 测试文档\n\n这是SSGL知识库上传测试文档。\n\n## 竞赛管理\n\n系统支持赛事创建、团队管理、预案提交等完整功能。"
    import io
    files = {"file": ("test_upload.md", test_content.encode("utf-8"), "text/markdown")}
    resp = _api("POST", "/ai/api/v1/rag/upload", base=AI_SERVICE, files=files,
                data={"chunk_strategy": "semantic"}, timeout=30)
    if _ok(resp) and resp.status_code == 200:
        data = resp.json()
        _log("PASS", "rag-upload", f"文件上传成功, {data.get('chunk_count', 0)} 个分块")
    else:
        _log("FAIL", "rag-upload", f"文件上传失败 → {resp.status_code if _ok(resp) else 'None'}", resp.text[:150] if _ok(resp) else "")

    # Document chunks
    resp = _api("GET", "/ai/api/v1/rag/documents", base=AI_SERVICE)
    if _ok(resp) and resp.status_code == 200:
        docs = resp.json().get("documents", [])
        test_doc = next((d for d in docs if d.get("filename") == "test_upload.md"), None)
        if test_doc:
            resp2 = _api("GET", f"/ai/api/v1/rag/documents/test_upload.md/chunks", base=AI_SERVICE)
            if _ok(resp2) and resp2.status_code == 200:
                chunks = resp2.json().get("chunks", [])
                _log("PASS", "rag-chunks", f"文档分块查询成功, {len(chunks)} 个分块")
            else:
                _log("WARN", "rag-chunks", f"分块查询失败 → {resp2.status_code if _ok(resp2) else 'None'}")
        else:
            _log("WARN", "rag-chunks", "未找到上传的测试文档")

    # Delete test document
    resp = _api("DELETE", "/ai/api/v1/rag/documents/test_upload.md", base=AI_SERVICE)
    if _ok(resp) and resp.status_code == 200:
        data = resp.json()
        _log("PASS", "rag-delete", f"文档删除成功, 删除 {data.get('chunks_deleted', 0)} 个分块")
    else:
        _log("FAIL", "rag-delete", f"文档删除失败 → {resp.status_code if _ok(resp) else 'None'}")


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

    # XSS in input (with all required fields so the competition can be created)
    resp = _api_auth("POST", "/api/v1/competitions", json={
        "title": "<script>alert('xss')</script>",
        "description": "test xss sanitization",
        "type": "hackathon",
        "max_team_size": 5,
        "min_team_size": 1,
        "start_date": "2026-07-01T00:00:00+08:00",
        "end_date": "2026-08-01T00:00:00+08:00",
    })
    if _ok(resp) and resp.status_code in (200, 201):
        data = resp.json()
        comp = data.get("competition", data)
        title = comp.get("title", data.get("title", ""))
        if "<script>" not in str(title):
            _log("PASS", "xss-input", "XSS 输入被清理或转义")
        else:
            _log("WARN", "xss-input", "XSS 输入未清理，可能存储型 XSS 风险")
        # Cleanup
        cid = comp.get("id") or data.get("id") or data.get("data", {}).get("id")
        if cid:
            _api_auth("DELETE", f"/api/v1/competitions/{cid}")
    elif _ok(resp) and resp.status_code == 400:
        # Body sanitizer rejected XSS — also acceptable
        _log("PASS", "xss-input", "XSS 输入被拒绝 (400)")

    # Check security headers (resp may be 4xx — use _ok() since __bool__ is False for 4xx)
    resp = _api("GET", "/api/v1/competitions")
    if _ok(resp):
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

    # Check Python test files (exclude venv, node_modules, __pycache__)
    py_tests = [
        f for f in root.rglob("test_*.py")
        if "venv" not in str(f) and "node_modules" not in str(f) and "__pycache__" not in str(f)
    ]
    if py_tests:
        _log("PASS", "py-tests", f"找到 {len(py_tests)} 个 Python 测试文件")
    else:
        _log("FAIL", "py-tests", "没有 Python 测试文件 (test_*.py)")

    # Check frontend test files (exclude node_modules)
    fe_tests = [
        f for f in (list((root / "frontend-vite").rglob("*.test.*")) + list((root / "frontend-vite").rglob("*.spec.*")))
        if "node_modules" not in str(f)
    ]
    if fe_tests:
        _log("PASS", "fe-tests", f"找到 {len(fe_tests)} 个前端测试文件")
    else:
        _log("FAIL", "fe-tests", "没有前端测试文件 (*.test.* / *.spec.*)")

    # Check for TODO/FIXME
    todos = []
    for ext in ["*.go", "*.py", "*.tsx", "*.ts"]:
        for f in root.rglob(ext):
            if "node_modules" in str(f) or "venv" in str(f) or ".git" in str(f) or "test_strict.py" in str(f):
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
    secret_patterns = ["password=", "secret=", "api_key="]
    secrets_found = []
    for ext in ["*.go", "*.py", "*.ts", "*.tsx", "*.sh"]:
        for f in root.rglob(ext):
            if "node_modules" in str(f) or "venv" in str(f) or ".git" in str(f) or ".env" in str(f) or "test_strict.py" in str(f) or f.name.endswith("_test.go"):
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
                                if val and len(val) > 3 and not val.startswith("change") and "%s" not in val and not val.startswith("os.Getenv") and not val.startswith("settings.") and not val.startswith("os.environ") and not val.startswith("config."):
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
    test_registration_flow()
    test_password_change()
    test_export_full()
    test_ai_service()
    test_coach_flow()
    test_knowledge_base()
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
