# ============================================================
# readiness_analyzer.py
# Determines candidate readiness for the role
# ============================================================

from typing import Dict, List


def analyze_readiness(
    parsed_resume: Dict,
    parsed_jd: Dict,
    match_result: Dict
) -> Dict:
    """
    Produces a readiness assessment for interviewers and hiring managers.
    """

    readiness_flags: List[str] = []
    strengths: List[str] = []
    gaps: List[str] = []

    # --------------------------------------------------------
    # Extract signals
    # --------------------------------------------------------

    final_score = match_result.get("final_score", 0.0)
    skill_score = match_result.get("skill_score", 0.0)
    experience_score = match_result.get("experience_score", 0.7)
    semantic_score = match_result.get("semantic_score", 0.0)

    matched_required = match_result.get("matched_required_skills", [])
    missing_required = match_result.get("missing_required_skills", [])

    yrs_r = parsed_resume.get("experience_years")
    yrs_j = parsed_jd.get("required_years")

    resume_roles = " ".join(parsed_resume.get("roles", [])).lower()
    jd_roles = " ".join(parsed_jd.get("jd_roles", [])).lower()

    # --------------------------------------------------------
    # Core skill readiness
    # --------------------------------------------------------

    if skill_score >= 0.8:
        strengths.append("Strong coverage of core required skills.")
    elif skill_score >= 0.65:
        readiness_flags.append("Core skills mostly present but depth should be validated.")
    else:
        gaps.append("Insufficient coverage of core required skills.")

    # --------------------------------------------------------
    # Experience readiness
    # --------------------------------------------------------

    if isinstance(yrs_r, int) and isinstance(yrs_j, int):
        if yrs_r >= yrs_j:
            strengths.append("Experience level meets or exceeds role expectations.")
        elif yrs_r >= yrs_j - 1:
            readiness_flags.append("Experience slightly below requirement but close.")
        else:
            gaps.append("Experience level below stated requirement.")
    else:
        readiness_flags.append("Experience level unclear from resume.")

    # --------------------------------------------------------
    # Seniority & ownership signals
    # --------------------------------------------------------

    seniority_terms = [
        "lead", "owner", "architecture", "design",
        "scalable", "mentored", "responsible for"
    ]

    if any(term in parsed_resume.get("raw_text_for_bert", "").lower()
           for term in seniority_terms):
        strengths.append("Shows signs of ownership or senior-level responsibility.")
    elif final_score >= 0.75:
        readiness_flags.append("Technical fit is strong but seniority signals are limited.")

    # --------------------------------------------------------
    # Role alignment readiness
    # --------------------------------------------------------

    if resume_roles and jd_roles:
        if any(tok in resume_roles for tok in jd_roles.split()):
            strengths.append("Resume role history aligns with target role.")
        else:
            readiness_flags.append("Role titles differ from target role.")

    # --------------------------------------------------------
    # Overall readiness classification
    # --------------------------------------------------------

    if final_score >= 0.85 and skill_score >= 0.8:
        readiness_level = "Ready"
        hiring_signal = "Strong Hire"
    elif final_score >= 0.7:
        readiness_level = "Mostly Ready"
        hiring_signal = "Hire with Validation"
    elif final_score >= 0.55:
        readiness_level = "Borderline"
        hiring_signal = "Proceed with Caution"
    else:
        readiness_level = "Not Ready"
        hiring_signal = "Do Not Hire"

    # --------------------------------------------------------
    # Output
    # --------------------------------------------------------

    return {
        "readiness_level": readiness_level,
        "hiring_signal": hiring_signal,
        "strengths": strengths,
        "flags": readiness_flags,
        "gaps": gaps
    }
