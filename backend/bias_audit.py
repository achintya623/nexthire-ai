# ============================================================
# bias_audit.py
# Bias auditing & fairness signals (non-scoring)
# ============================================================

from typing import Dict, Any

PROTECTED_TERMS = {
    "gender": ["male", "female", "woman", "man"],
    "religion": ["hindu", "muslim", "christian", "jewish"],
    "nationality": ["indian", "american", "pakistani", "british"],
    "age": ["years old", "age", "born"],
}

def detect_bias_signals(text: str) -> Dict[str, Any]:
    text = text.lower()
    findings = {}

    for category, terms in PROTECTED_TERMS.items():
        hits = [t for t in terms if t in text]
        if hits:
            findings[category] = hits

    return findings


def compute_bias_risk(parsed_resume: Dict[str, Any]) -> Dict[str, Any]:
    raw_text = parsed_resume.get("raw_text_for_bert", "")

    signals = detect_bias_signals(raw_text)

    risk_score = min(1.0, len(signals) * 0.25)

    return {
        "bias_risk_score": round(risk_score, 2),
        "bias_flags": signals,
        "bias_safe": risk_score < 0.4
    }
