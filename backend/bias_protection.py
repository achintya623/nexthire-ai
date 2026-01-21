# ==============================================================
# bias_protection.py
# Scrub protected/sensitive signals before embedding/matching
# ==============================================================

import re
from typing import Dict, Any

# Very conservative list of tokens to redact (extend as needed)
SENSITIVE_PATTERNS = [
    r"\bage\b\s*[:\-]?\s*\d{1,2}",                # age: 24
    r"\bmarital status\b\s*[:\-]?\s*\w+",         # marital status: single
    r"\breligion\b\s*[:\-]?\s*\w+",               # religion: hindu
    r"\bnationality\b\s*[:\-]?\s*[\w\s]+",        # nationality: indian
    r"\bgender\b\s*[:\-]?\s*\w+",                 # gender: female
    r"\bpregnan\w+\b",                             # pregnant/pregnancy
    r"\bvisa\b|\bwork permit\b",                  # immigration (optional)
]

SENSITIVE_REGEXES = [re.compile(pat, flags=re.I) for pat in SENSITIVE_PATTERNS]

def scrub_text(text: str) -> str:
    if not text:
        return text
    cleaned = text
    for rx in SENSITIVE_REGEXES:
        cleaned = rx.sub("[REDACTED]", cleaned)
    return cleaned

def scrub_structured(d: Dict[str, Any]) -> Dict[str, Any]:
    """Recursively scrub string fields in structured dict."""
    if isinstance(d, dict):
        return {k: scrub_structured(v) for k, v in d.items()}
    if isinstance(d, list):
        return [scrub_structured(x) for x in d]
    if isinstance(d, str):
        return scrub_text(d)
    return d
