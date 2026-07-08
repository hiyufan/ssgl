from app.models.schemas import ExecutionMatch
from app.utils.review_contract import normalize_execution_match_result


def test_execution_match_accepts_frontend_payload_shape():
    body = ExecutionMatch(
        pre_plan_id=12,
        plan_text="项目预案：智能竞赛助手。",
        execution_text="实际执行：完成了知识库和答辩陪练，延期两周。",
    )

    assert body.pre_plan_id == 12
    assert body.plan_text.startswith("项目预案")
    assert body.execution_text.startswith("实际执行")


def test_normalizes_legacy_execution_match_response_shape():
    normalized = normalize_execution_match_result({
        "score": 73,
        "breakdown": {"alignment": 70, "risk_coverage": 65},
        "summary": "执行基本匹配，但风险应对不足。",
        "deviations": [
            "实际交付范围缩小",
            {"area": "进度", "severity": "high", "description": "延期两周"},
        ],
        "suggestions": ["补充验收指标"],
    })

    assert normalized == {
        "match_score": 73,
        "dimension_scores": {"alignment": 70, "risk_coverage": 65},
        "summary": "执行基本匹配，但风险应对不足。",
        "gaps": [
            {"area": "执行偏差", "severity": "medium", "description": "实际交付范围缩小"},
            {"area": "进度", "severity": "high", "description": "延期两周"},
        ],
        "recommendations": ["补充验收指标"],
    }
