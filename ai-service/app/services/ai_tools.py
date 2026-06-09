"""AI Tools - Functions that the AI assistant can call to interact with the system."""

import json
import logging
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import text
from app.database import engine

logger = logging.getLogger(__name__)


class AITools:
    """Tools that the AI assistant can use to read/write data."""

    # ── Query Tools (Read-only) ─────────────────────────────

    def get_competitions(self, status: str = None, limit: int = 10) -> dict:
        """Get list of competitions."""
        query = "SELECT id, title, type, status, start_date, end_date, location, prize FROM competitions"
        params = {}

        if status:
            query += " WHERE status = :status"
            params["status"] = status

        query += " ORDER BY created_at DESC LIMIT :limit"
        params["limit"] = limit

        with engine.begin() as conn:
            rows = conn.execute(text(query), params).mappings().all()

        return {
            "competitions": [dict(r) for r in rows],
            "total": len(rows),
        }

    def get_competition_detail(self, comp_id: int) -> dict:
        """Get competition details with teams and awards."""
        with engine.begin() as conn:
            # Competition info
            comp = conn.execute(
                text("SELECT * FROM competitions WHERE id = :id"),
                {"id": comp_id}
            ).mappings().first()

            if not comp:
                return {"error": "Competition not found"}

            # Teams
            teams = conn.execute(
                text("""
                    SELECT t.id, t.name, t.status, u.name as leader_name,
                           (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count
                    FROM teams t
                    LEFT JOIN users u ON t.leader_id = u.id
                    WHERE t.competition_id = :id
                """),
                {"id": comp_id}
            ).mappings().all()

            # Awards
            awards = conn.execute(
                text("""
                    SELECT a.rank_name, a.prize_amount, t.name as team_name
                    FROM awards a
                    LEFT JOIN teams t ON a.team_id = t.id
                    WHERE a.competition_id = :id
                """),
                {"id": comp_id}
            ).mappings().all()

        return {
            "competition": dict(comp),
            "teams": [dict(t) for t in teams],
            "awards": [dict(a) for a in awards],
        }

    def get_teams(self, status: str = None, comp_id: int = None, limit: int = 20) -> dict:
        """Get list of teams."""
        query = """
            SELECT t.id, t.name, t.status,
                   c.title as competition_name,
                   u.name as leader_name,
                   (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count
            FROM teams t
            LEFT JOIN competitions c ON t.competition_id = c.id
            LEFT JOIN users u ON t.leader_id = u.id
            WHERE 1=1
        """
        params = {}

        if status:
            query += " AND t.status = :status"
            params["status"] = status
        if comp_id:
            query += " AND t.competition_id = :comp_id"
            params["comp_id"] = comp_id

        query += " ORDER BY t.created_at DESC LIMIT :limit"
        params["limit"] = limit

        with engine.begin() as conn:
            rows = conn.execute(text(query), params).mappings().all()

        return {"teams": [dict(r) for r in rows]}

    def get_pending_approvals(self, role: str = None, limit: int = 20) -> dict:
        """Get pending approvals."""
        query = """
            SELECT aw.id, aw.type, aw.status, aw.created_at,
                   u.name as submitter_name,
                   CASE
                       WHEN aw.type = 'registration' THEN '报名审批'
                       WHEN aw.type = 'pre_plan' THEN '预计划审批'
                       WHEN aw.type = 'reward' THEN '奖励审批'
                   END as type_name
            FROM approval_workflows aw
            LEFT JOIN users u ON aw.submitter_id = u.id
            WHERE aw.status = 'pending'
            ORDER BY aw.created_at DESC
            LIMIT :limit
        """

        with engine.begin() as conn:
            rows = conn.execute(text(query), {"limit": limit}).mappings().all()

        return {"approvals": [dict(r) for r in rows], "total": len(rows)}

    def get_pre_plans(self, status: str = None, limit: int = 10) -> dict:
        """Get pre-plans with AI review scores."""
        query = """
            SELECT pp.id, pp.title, pp.status, pp.ai_review_score, pp.submitted_at,
                   t.name as team_name,
                   c.title as competition_name
            FROM pre_plans pp
            LEFT JOIN teams t ON pp.team_id = t.id
            LEFT JOIN competitions c ON pp.competition_id = c.id
            WHERE 1=1
        """
        params = {}

        if status:
            query += " AND pp.status = :status"
            params["status"] = status

        query += " ORDER BY pp.submitted_at DESC LIMIT :limit"
        params["limit"] = limit

        with engine.begin() as conn:
            rows = conn.execute(text(query), params).mappings().all()

        return {"pre_plans": [dict(r) for r in rows]}

    def get_evaluations(self, teacher_id: int = None, limit: int = 20) -> dict:
        """Get student evaluations."""
        query = """
            SELECT se.id, se.teaching, se.communication, se.availability, se.overall, se.feedback,
                   se.submitted_at,
                   s.name as student_name,
                   t.name as teacher_name,
                   c.title as competition_name
            FROM student_evaluations se
            LEFT JOIN users s ON se.student_id = s.id
            LEFT JOIN users t ON se.teacher_id = t.id
            LEFT JOIN competitions c ON se.competition_id = c.id
            WHERE 1=1
        """
        params = {}

        if teacher_id:
            query += " AND se.teacher_id = :teacher_id"
            params["teacher_id"] = teacher_id

        query += " ORDER BY se.submitted_at DESC LIMIT :limit"
        params["limit"] = limit

        with engine.begin() as conn:
            rows = conn.execute(text(query), params).mappings().all()

        return {"evaluations": [dict(r) for r in rows]}

    def get_statistics(self) -> dict:
        """Get platform statistics."""
        with engine.begin() as conn:
            stats = {}

            # User counts
            stats["total_users"] = conn.execute(text("SELECT COUNT(*) FROM users")).scalar()
            stats["total_students"] = conn.execute(text("SELECT COUNT(*) FROM users WHERE role = 'student'")).scalar()
            stats["total_teachers"] = conn.execute(text("SELECT COUNT(*) FROM users WHERE role = 'teacher'")).scalar()

            # Competition counts
            stats["total_competitions"] = conn.execute(text("SELECT COUNT(*) FROM competitions")).scalar()
            stats["ongoing_competitions"] = conn.execute(text("SELECT COUNT(*) FROM competitions WHERE status = 'ongoing'")).scalar()
            stats["completed_competitions"] = conn.execute(text("SELECT COUNT(*) FROM competitions WHERE status = 'completed'")).scalar()

            # Team counts
            stats["total_teams"] = conn.execute(text("SELECT COUNT(*) FROM teams")).scalar()
            stats["active_teams"] = conn.execute(text("SELECT COUNT(*) FROM teams WHERE status = 'active'")).scalar()

            # Approval counts
            stats["pending_approvals"] = conn.execute(text("SELECT COUNT(*) FROM approval_workflows WHERE status = 'pending'")).scalar()

            # Award counts
            stats["total_awards"] = conn.execute(text("SELECT COUNT(*) FROM awards")).scalar()

            # Pre-plan stats
            stats["total_pre_plans"] = conn.execute(text("SELECT COUNT(*) FROM pre_plans")).scalar()
            stats["avg_ai_score"] = conn.execute(text("SELECT COALESCE(AVG(ai_review_score), 0) FROM pre_plans WHERE ai_review_score IS NOT NULL")).scalar()

        return stats

    def get_teacher_performance(self, teacher_id: int = None) -> dict:
        """Get teacher performance data."""
        query = """
            SELECT u.id, u.name, u.dept,
                   (SELECT COUNT(*) FROM teams WHERE leader_id IN
                     (SELECT id FROM team_members WHERE user_id = u.id)) as guided_teams,
                   (SELECT AVG(overall) FROM student_evaluations WHERE teacher_id = u.id) as avg_rating,
                   (SELECT COUNT(*) FROM student_evaluations WHERE teacher_id = u.id) as eval_count
            FROM users u
            WHERE u.role = 'teacher'
        """
        params = {}

        if teacher_id:
            query += " AND u.id = :teacher_id"
            params["teacher_id"] = teacher_id

        with engine.begin() as conn:
            rows = conn.execute(text(query), params).mappings().all()

        return {"teachers": [dict(r) for r in rows]}

    # ── Action Tools (Write) ─────────────────────────────────

    def approve_workflow(self, workflow_id: int, approver_id: int, comment: str = "") -> dict:
        """Approve a workflow."""
        with engine.begin() as conn:
            # Get workflow
            workflow = conn.execute(
                text("SELECT * FROM approval_workflows WHERE id = :id AND status = 'pending'"),
                {"id": workflow_id}
            ).mappings().first()

            if not workflow:
                return {"error": "Workflow not found or already processed"}

            # Update workflow status
            conn.execute(
                text("UPDATE approval_workflows SET status = 'approved', updated_at = NOW() WHERE id = :id"),
                {"id": workflow_id}
            )

            # Add approval step
            conn.execute(
                text("""
                    INSERT INTO approval_steps (workflow_id, step_order, approver_id, action, comment, acted_at)
                    VALUES (:workflow_id, 1, :approver_id, 'approved', :comment, NOW())
                """),
                {"workflow_id": workflow_id, "approver_id": approver_id, "comment": comment}
            )

        return {"success": True, "message": "审批已通过"}

    def reject_workflow(self, workflow_id: int, approver_id: int, comment: str = "") -> dict:
        """Reject a workflow."""
        with engine.begin() as conn:
            workflow = conn.execute(
                text("SELECT * FROM approval_workflows WHERE id = :id AND status = 'pending'"),
                {"id": workflow_id}
            ).mappings().first()

            if not workflow:
                return {"error": "Workflow not found or already processed"}

            conn.execute(
                text("UPDATE approval_workflows SET status = 'rejected', updated_at = NOW() WHERE id = :id"),
                {"id": workflow_id}
            )

            conn.execute(
                text("""
                    INSERT INTO approval_steps (workflow_id, step_order, approver_id, action, comment, acted_at)
                    VALUES (:workflow_id, 1, :approver_id, 'rejected', :comment, NOW())
                """),
                {"workflow_id": workflow_id, "approver_id": approver_id, "comment": comment}
            )

        return {"success": True, "message": "审批已驳回"}

    def generate_report(self, report_type: str, params: dict = None) -> dict:
        """Generate a data report."""
        if report_type == "competition_summary":
            return self._generate_competition_report(params)
        elif report_type == "team_performance":
            return self._generate_team_report(params)
        elif report_type == "teacher_evaluation":
            return self._generate_teacher_report(params)
        else:
            return {"error": f"Unknown report type: {report_type}"}

    def _generate_competition_report(self, params: dict = None) -> dict:
        """Generate competition summary report."""
        stats = self.get_statistics()
        comps = self.get_competitions(limit=5)

        report = f"""# 赛事运营报告

## 总体概况
- 赛事总数：{stats['total_competitions']}
- 进行中：{stats['ongoing_competitions']}
- 已完成：{stats['completed_competitions']}
- 参赛团队：{stats['total_teams']}
- 待处理审批：{stats['pending_approvals']}

## 近期赛事
"""
        for comp in comps.get("competitions", []):
            report += f"- {comp['title']} ({comp['status']})\n"

        return {"report": report, "data": stats}

    def _generate_team_report(self, params: dict = None) -> dict:
        """Generate team performance report."""
        teams = self.get_teams(limit=10)

        report = "# 团队表现报告\n\n"
        for team in teams.get("teams", []):
            report += f"## {team['name']}\n"
            report += f"- 赛事：{team.get('competition_name', 'N/A')}\n"
            report += f"- 队长：{team.get('leader_name', 'N/A')}\n"
            report += f"- 成员数：{team.get('member_count', 0)}\n"
            report += f"- 状态：{team['status']}\n\n"

        return {"report": report, "data": teams}

    def _generate_teacher_report(self, params: dict = None) -> dict:
        """Generate teacher evaluation report."""
        teachers = self.get_teacher_performance()

        report = "# 教师指导报告\n\n"
        for teacher in teachers.get("teachers", []):
            report += f"## {teacher['name']} ({teacher.get('dept', '')})\n"
            report += f"- 指导团队：{teacher.get('guided_teams', 0)}\n"
            report += f"- 平均评分：{teacher.get('avg_rating', 0):.1f}\n"
            report += f"- 评价数量：{teacher.get('eval_count', 0)}\n\n"

        return {"report": report, "data": teachers}


# Module-level singleton
ai_tools = AITools()
