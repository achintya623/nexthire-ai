# ============================================================
# interview_insight.py
# Generates interviewer-facing insights & guidance
# ============================================================

from typing import Dict, List


def generate_interview_insights(
    parsed_resume: Dict,
    parsed_jd: Dict,
    match_result: Dict,
    interview_focus: Dict
) -> Dict:
    """
    Converts match + focus signals into actionable interviewer guidance.
    """

    insights: List[str] = []
    watchouts: List[str] = []
    probes: List[str] = []

    # --------------------------------------------------------
    # Core signals
    # --------------------------------------------------------

    final_score = match_result.get("final_score", 0.0)
    skill_score = match_result.get("skill_score", 0.0)
    semantic_score = match_result.get("semantic_score", 0.0)
    experience_score = match_result.get("experience_score", 0.7)

    matched_required = match_result.get("matched_required_skills", [])
    missing_required = match_result.get("missing_required_skills", [])

    focus_areas = interview_focus.get("focus_areas", [])
    flags = interview_focus.get("risk_flags", [])


    resume_skills = set(parsed_resume.get("skills", []))
    jd_required = set(parsed_jd.get("required_skills", []))
    jd_optional = set(parsed_jd.get("optional_skills", []))

    # --------------------------------------------------------
    # Positive signals
    # --------------------------------------------------------

    if final_score >= 0.8:
        insights.append(
            "Candidate shows strong overall alignment with role requirements."
        )

    if skill_score >= 0.8:
        insights.append(
            "Core technical skills appear well covered based on resume evidence."
        )

    if semantic_score >= 0.75:
        insights.append(
            "Resume language closely aligns with job description responsibilities."
        )

    if experience_score >= 0.9:
        insights.append(
            "Experience level meets or exceeds role expectations."
        )

    # --------------------------------------------------------
    # Risk signals
    # --------------------------------------------------------

    if missing_required:
        watchouts.append(
            "Some required skills are missing or weakly demonstrated: " +
            ", ".join(missing_required[:5])
        )

    if skill_score < 0.6:
        watchouts.append(
            "Overall skill coverage is moderate; depth validation is recommended."
        )

    if experience_score < 0.75:
        watchouts.append(
            "Years of experience may be below stated requirement."
        )

    if "role_uncertainty" in flags:
        watchouts.append(
            "Resume role titles do not clearly align with the job role."
        )

    if "skill_risk" in flags:
        watchouts.append(
            "Candidate may rely on surface-level familiarity rather than deep expertise."
        )

    # --------------------------------------------------------
    # Suggested probe areas (NOT questions)
    # --------------------------------------------------------

    if any(area in {"core_fundamentals", "missing_required_skills"} for area in focus_areas):
        if matched_required:
            probes.append(
                "Ask for concrete examples demonstrating depth in: " +
                ", ".join(matched_required[:3])
            )

    if missing_required:
        probes.append(
            "Clarify exposure or learning approach for missing skills: " +
            ", ".join(missing_required[:3])
        )

    if jd_optional & resume_skills:
        probes.append(
            "Explore optional skills that may differentiate the candidate."
        )

    if semantic_score >= 0.8 and skill_score < 0.7:
        probes.append(
            "Check for overuse of generic terminology without concrete implementation details."
        )

    # --------------------------------------------------------
    # Confidence interpretation (for interviewer calibration)
    # --------------------------------------------------------

    if final_score >= 0.85:
        confidence_note = (
            "High confidence fit — focus on decision-making, tradeoffs, and ownership."
        )
    elif final_score >= 0.7:
        confidence_note = (
            "Moderate-to-strong fit — validate consistency and depth."
        )
    elif final_score >= 0.55:
        confidence_note = (
            "Borderline fit — interview should emphasize risk reduction."
        )
    else:
        confidence_note = (
            "Low fit — use interview primarily for screening and clarification."
        )

    # --------------------------------------------------------
    # Output
    # --------------------------------------------------------

    return {
        "summary": confidence_note,
        "positive_signals": insights,
        "risk_signals": watchouts,
        "suggested_probes": probes
    }
