# ============================================================
# interview_focus.py
# Decide interview focus areas & difficulty
# ============================================================

from typing import Dict, Any, List


def determine_interview_focus(
    match_result: Dict[str, Any],
    parsed_jd: Dict[str, Any],
    parsed_resume: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Converts matching + parsing signals into interview priorities
    """

    focus_areas: List[str] = []
    risk_flags: List[str] = []

    final_score = match_result.get("final_score", 0.0)
    skill_score = match_result.get("skill_score", 0.0)
    semantic_score = match_result.get("semantic_score", 0.0)
    experience_score = match_result.get("experience_score", 0.0)

    matched_required = match_result.get("matched_required_skills", [])
    missing_required = match_result.get("missing_required_skills", [])

    jd_roles = parsed_jd.get("jd_roles", [])
    resume_roles = parsed_resume.get("roles", [])

    yrs_required = parsed_jd.get("required_years")
    yrs_candidate = parsed_resume.get("experience_years")

    # --------------------------------------------------------
    # 1. Difficulty level
    # --------------------------------------------------------
    if final_score >= 0.85:
        difficulty = "hard"
    elif final_score >= 0.65:
        difficulty = "medium"
    else:
        difficulty = "easy"

    # --------------------------------------------------------
    # 2. Core skill validation
    # --------------------------------------------------------
    if skill_score < 0.7:
        focus_areas.append("core_fundamentals")

    # --------------------------------------------------------
    # 3. Missing required skills
    # --------------------------------------------------------
    if missing_required:
        focus_areas.append("missing_required_skills")
        risk_flags.append("required_skill_gaps")

    # --------------------------------------------------------
    # 4. Semantic strength → depth testing
    # --------------------------------------------------------
    if semantic_score >= 0.75:
        focus_areas.append("architecture_and_decisions")

    # --------------------------------------------------------
    # 5. Experience mismatch
    # --------------------------------------------------------
    if (
        isinstance(yrs_required, int)
        and isinstance(yrs_candidate, int)
        and yrs_candidate < yrs_required
    ):
        focus_areas.append("experience_validation")
        risk_flags.append("experience_below_requirement")

    # --------------------------------------------------------
    # 6. Role alignment check
    # --------------------------------------------------------
    if jd_roles and not resume_roles:
        focus_areas.append("role_clarity")
        risk_flags.append("unclear_role_alignment")

    # --------------------------------------------------------
    # 7. Seniority signals
    # --------------------------------------------------------
    if experience_score >= 0.9 and semantic_score >= 0.7:
        focus_areas.append("system_design_light")

    # --------------------------------------------------------
    # 8. Safe defaults
    # --------------------------------------------------------
    if not focus_areas:
        focus_areas = ["general_problem_solving"]

    return {
        "difficulty": difficulty,
        "focus_areas": list(dict.fromkeys(focus_areas)),  # dedupe, preserve order
        "risk_flags": risk_flags
    }
