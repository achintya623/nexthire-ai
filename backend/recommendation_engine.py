# ============================================================
# recommendation_engine.py
# Final hiring recommendation synthesizer
# ============================================================

from typing import Dict


def _format_focus_key(key: str) -> str:
    """
    Converts internal snake_case focus key to human readable title.
    """
    return key.replace("_", " ").title()


def generate_recommendation(
    parsed_resume: Dict,
    parsed_jd: Dict,
    match_result: Dict,
    interview_focus: Dict,
    interview_insight: Dict,
    readiness: Dict,
    bias: Dict
) -> Dict:
    """
    Generates final AI recommendation and confidence meter.
    """

    final_score = match_result.get("final_score", 0.0)
    confidence_score = match_result.get("confidence_score", 0.0)

    readiness_level = readiness.get("readiness_level", "Unknown")
    hiring_signal = readiness.get("hiring_signal", "Unknown")

    strengths = readiness.get("strengths", [])
    flags = readiness.get("flags", [])
    gaps = readiness.get("gaps", [])

    bias_flags = bias.get("bias_flags", {})

    # --------------------------------------------------------
    # AI Confidence Meter (human-friendly)
    # --------------------------------------------------------

    ai_confidence = round(
        (0.6 * final_score + 0.4 * confidence_score) * 100
    )

    if ai_confidence >= 85:
        confidence_label = "High"
    elif ai_confidence >= 70:
        confidence_label = "Medium"
    else:
        confidence_label = "Low"

    # --------------------------------------------------------
    # Final Recommendation Logic
    # --------------------------------------------------------

    if readiness_level == "Ready" and final_score >= 0.85:
        recommendation = "Proceed"
        recommendation_note = "Strong alignment with role expectations."
    elif readiness_level in {"Ready", "Mostly Ready"} and final_score >= 0.7:
        recommendation = "Proceed with Focused Interview"
        recommendation_note = "Good match; validate flagged areas during interview."
    elif readiness_level == "Borderline":
        recommendation = "Proceed with Caution"
        recommendation_note = "Potential fit, but risks must be validated."
    else:
        recommendation = "Do Not Proceed"
        recommendation_note = "Insufficient alignment for this role."

    # --------------------------------------------------------
    # Interviewer Guidance Summary
    # --------------------------------------------------------

    guidance = []

    if strengths:
        guidance.append(
            "Leverage strengths: " + "; ".join(strengths[:3])
        )

    if flags:
        guidance.append(
            "Validate during interview: " + "; ".join(flags[:3])
        )

    if gaps:
        guidance.append(
            "Risk areas: " + "; ".join(gaps[:3])
        )

    # ✅ FIXED: Human-readable focus areas
    focus_keys = interview_focus.get("focus_areas", [])

    if focus_keys:
        formatted_focus = [
            _format_focus_key(k) for k in focus_keys[:5]
        ]

        guidance.append(
            "Suggested focus areas: " +
            ", ".join(formatted_focus)
        )

    # --------------------------------------------------------
    # Bias & Compliance
    # --------------------------------------------------------

    bias_note = (
        "⚠ Bias-sensitive information detected. "
        "Matching score was not affected."
        if bias_flags else
        "✅ No bias-sensitive signals detected."
    )

    # --------------------------------------------------------
    # Final Output
    # --------------------------------------------------------

    return {
        "final_recommendation": recommendation,
        "recommendation_note": recommendation_note,
        "ai_confidence_meter": {
            "score_percent": ai_confidence,
            "confidence_level": confidence_label
        },
        "readiness_level": readiness_level,
        "hiring_signal": hiring_signal,
        "interviewer_guidance": guidance,
        "bias_compliance": bias_note
    }
