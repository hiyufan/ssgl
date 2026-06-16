#!/usr/bin/env python3
"""Test new endpoints: competition stats, teacher review, preplan delete."""
import requests
import json
import sys

BACKEND = "http://localhost:8080"

# Login
resp = requests.post(f"{BACKEND}/api/v1/auth/login", json={"username":"liuzy","password":"admin123"}, timeout=10)
data = resp.json()
tokens = data.get("tokens", data)
token = tokens.get("access_token", tokens.get("token", ""))
if not token:
    print("FAIL: login failed")
    sys.exit(1)
headers = {"Authorization": f"Bearer {token}"}

results = []

def test(name, condition, msg=""):
    status = "PASS" if condition else "FAIL"
    results.append((status, name, msg))
    print(f"  {'PASS' if condition else 'FAIL'} {name}: {msg}")

# 0. Create a competition to test stats with
comp_data = {
    "title": f"Stats测试赛事",
    "description": "测试赛事统计",
    "type": "hackathon",
    "max_team_size": 5,
    "min_team_size": 1,
    "start_date": "2026-07-01T00:00:00+08:00",
    "end_date": "2026-08-01T00:00:00+08:00",
    "location": "线上",
}
resp = requests.post(f"{BACKEND}/api/v1/competitions", headers=headers, json=comp_data, timeout=10)
if resp.status_code in (200, 201):
    comp = resp.json().get("competition", resp.json())
    comp_id = comp.get("id")
    test("comp-create-for-stats", True, f"id={comp_id}")
else:
    test("comp-create-for-stats", False, f"status={resp.status_code}")
    comp_id = None

# 1. Competition Stats
if comp_id:
    resp = requests.get(f"{BACKEND}/api/v1/competitions/{comp_id}/stats", headers=headers, timeout=10)
    test("comp-stats-exist", resp.status_code == 200, f"status={resp.status_code}")
    if resp.status_code == 200:
        d = resp.json()
        test("comp-stats-fields", "team_count" in d and "student_count" in d, 
             f"teams={d.get('team_count')}, students={d.get('student_count')}, preplans={d.get('preplan_count')}, awards={d.get('award_count')}")

# 2. Competition Stats for non-existent
resp = requests.get(f"{BACKEND}/api/v1/competitions/99999/stats", headers=headers, timeout=10)
test("comp-stats-404", resp.status_code == 404, f"status={resp.status_code}")

# 3. Teacher Review (approve)
resp = requests.get(f"{BACKEND}/api/v1/pre-plans", headers=headers, timeout=10)
if resp.status_code == 200:
    preplans = resp.json().get("pre_plans", [])
    if preplans:
        pp_id = preplans[0]["id"]
        resp = requests.post(f"{BACKEND}/api/v1/pre-plans/{pp_id}/teacher-review", 
                           headers=headers, 
                           json={"action": "approve", "notes": "内容详实，同意通过"},
                           timeout=10)
        test("teacher-review-approve", resp.status_code == 200, f"status={resp.status_code}")
        if resp.status_code == 200:
            r = resp.json()
            test("teacher-review-action", r.get("action") == "approve", f"action={r.get('action')}")

# 4. Teacher Review (reject)
resp = requests.get(f"{BACKEND}/api/v1/pre-plans", headers=headers, timeout=10)
if resp.status_code == 200:
    preplans = resp.json().get("pre_plans", [])
    if preplans:
        pp_id = preplans[-1]["id"]
        resp = requests.post(f"{BACKEND}/api/v1/pre-plans/{pp_id}/teacher-review", 
                           headers=headers, 
                           json={"action": "reject", "notes": "需要更多细节"},
                           timeout=10)
        test("teacher-review-reject", resp.status_code == 200, f"status={resp.status_code}")

# 5. Teacher Review - bad action
resp = requests.post(f"{BACKEND}/api/v1/pre-plans/1/teacher-review", 
                   headers=headers, 
                   json={"action": "invalid", "notes": "test"},
                   timeout=10)
test("teacher-review-bad-action", resp.status_code == 400, f"status={resp.status_code}")

# 6. Preplan Create + Delete
resp = requests.post(f"{BACKEND}/api/v1/pre-plans", headers=headers, json={
    "competition_id": 1,
    "team_id": 1,
    "title": "测试预案-自动删除",
    "tech_stack": "Go, React",
}, timeout=10)
if resp.status_code in (200, 201):
    pp = resp.json().get("pre_plan", {})
    pp_id = pp.get("id")
    test("preplan-create", True, f"id={pp_id}")
    
    # Delete it
    resp = requests.delete(f"{BACKEND}/api/v1/pre-plans/{pp_id}", headers=headers, timeout=10)
    test("preplan-delete", resp.status_code == 200, f"status={resp.status_code}")
    
    # Verify it's gone
    resp = requests.get(f"{BACKEND}/api/v1/pre-plans/{pp_id}", headers=headers, timeout=10)
    test("preplan-gone", resp.status_code == 404, f"status={resp.status_code}")
else:
    test("preplan-create", False, f"status={resp.status_code}")

# 7. Delete non-existent preplan
resp = requests.delete(f"{BACKEND}/api/v1/pre-plans/99999", headers=headers, timeout=10)
test("preplan-delete-404", resp.status_code == 404, f"status={resp.status_code}")

# 8. Cleanup - delete test competition
if comp_id:
    resp = requests.delete(f"{BACKEND}/api/v1/competitions/{comp_id}", headers=headers, timeout=10)
    test("comp-cleanup", resp.status_code == 200, f"deleted comp {comp_id}")

# Summary
passed = sum(1 for s, _, _ in results if s == "PASS")
failed = sum(1 for s, _, _ in results if s == "FAIL")
print(f"\n{'='*40}")
print(f"Results: {passed} PASS, {failed} FAIL / {len(results)} total")
print(f"{'='*40}")
