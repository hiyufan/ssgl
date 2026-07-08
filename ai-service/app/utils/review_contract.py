"""Response contract helpers for AI review endpoints."""


def _score(value: object) -> int:
    try:
        numeric = int(round(float(value)))  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return 0
    return max(0, min(100, numeric))


def _string_list(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    return [item.strip() for item in value if isinstance(item, str) and item.strip()]


def _dimension_scores(value: object) -> dict[str, int]:
    if not isinstance(value, dict):
        return {}
    return {str(key): _score(score) for key, score in value.items()}


def _normalize_gap(item: object) -> dict | None:
    if isinstance(item, str) and item.strip():
        return {
            "area": "执行偏差",
            "severity": "medium",
            "description": item.strip(),
        }

    if not isinstance(item, dict):
        return None

    description = str(item.get("description") or item.get("content") or "").strip()
    if not description:
        return None

    severity = item.get("severity")
    if severity not in {"low", "medium", "high"}:
        severity = "medium"

    return {
        "area": str(item.get("area") or item.get("dimension") or "执行偏差"),
        "severity": severity,
        "description": description,
    }


def normalize_execution_match_result(result: dict) -> dict:
    """Return the canonical response consumed by the Vue execution-match page."""

    raw_gaps = result.get("gaps") or result.get("deviations") or []
    gaps = []
    if isinstance(raw_gaps, list):
        gaps = [gap for item in raw_gaps if (gap := _normalize_gap(item))]

    return {
        "match_score": _score(result.get("match_score", result.get("score"))),
        "dimension_scores": _dimension_scores(
            result.get("dimension_scores") or result.get("breakdown") or {}
        ),
        "summary": str(result.get("summary") or result.get("feedback") or ""),
        "gaps": gaps,
        "recommendations": _string_list(
            result.get("recommendations") or result.get("suggestions") or []
        ),
    }
