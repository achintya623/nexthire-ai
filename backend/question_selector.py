# ============================================================
# question_selector.py
# Intelligent Adaptive Interview Question Engine (Advanced)
# ============================================================

from typing import Dict, List
import random
from question_library import QUESTION_LIBRARY


def _format_question(q: Dict) -> Dict:
    return {
        "question": q["question"],
        "strong_answer_signals": [q["strong_signal"]],
        "weak_answer_signals": [q["weak_signal"]],
        "follow_up": q.get("follow_up", {}),
        "difficulty": q.get("difficulty", "medium")
    }


def _choose_random(questions: List[Dict], k: int = 1):
    if not questions:
        return []
    return random.sample(questions, min(len(questions), k))


def select_interview_questions(
    match_result: Dict,
    max_questions: int = 6
) -> List[Dict]:

    selected: List[Dict] = []

    confidence = match_result.get("confidence_score", 0.5)
    missing_skills = match_result.get("missing_required_skills", [])
    role_match = match_result.get("role_match", True)
    experience_score = match_result.get("experience_score", 0.7)
    final_score = match_result.get("final_score", 0.5)

    # =========================================================
    # 1️⃣ Always include ONE randomized fundamental question
    # =========================================================
    fundamentals = _choose_random(
        QUESTION_LIBRARY["core_fundamentals"], 1
    )
    selected.extend(_format_question(q) for q in fundamentals)

    # =========================================================
    # 2️⃣ Missing Skills (Weighted Risk)
    # =========================================================
    if missing_skills:
        top_missing = missing_skills[:3]
        skill_list = ", ".join(top_missing)

        selected.append({
            "question": f"This role requires {skill_list}. Can you describe your hands-on experience across these?",
            "strong_answer_signals": [
                "Provides concrete project examples",
                "Explains depth of involvement",
                "Demonstrates understanding of trade-offs"
            ],
            "weak_answer_signals": [
                "Speaks vaguely",
                "Avoids specifics",
                "Overstates familiarity"
            ],
            "follow_up": {
                "if_strong": {
                    "question": "Which of these would you consider your strongest and weakest? Why?",
                    "purpose": "Assess calibration and depth awareness."
                },
                "if_weak": {
                    "question": "How would you prioritize learning these in your first month?",
                    "purpose": "Evaluate structured learning strategy."
                }
            },
            "difficulty": "adaptive"
        })

    # =========================================================
    # 3️⃣ Role Clarity (only if mismatch)
    # =========================================================
    if not role_match:
        selected.extend(
            _format_question(q)
            for q in _choose_random(
                QUESTION_LIBRARY["role_clarity"], 1
            )
        )

    # =========================================================
    # 4️⃣ Experience Validation (only if weak)
    # =========================================================
    if experience_score < 0.8:
        selected.extend(
            _format_question(q)
            for q in _choose_random(
                QUESTION_LIBRARY["experience_validation"], 1
            )
        )

    # =========================================================
    # 5️⃣ Senior Depth Scaling
    # =========================================================
    if confidence > 0.7:
        selected.extend(
            _format_question(q)
            for q in _choose_random(
                QUESTION_LIBRARY["architecture_and_decisions"], 1
            )
        )

    if confidence > 0.85 and experience_score > 0.85:
        selected.extend(
            _format_question(q)
            for q in _choose_random(
                QUESTION_LIBRARY["system_design_light"], 1
            )
        )

    # =========================================================
    # 6️⃣ High-Risk Behavioral Probe (Low Score Only)
    # =========================================================
    if final_score < 0.6:
        selected.append({
            "question": "Tell me about a time you had to learn something quickly under pressure. What was your approach?",
            "strong_answer_signals": [
                "Describes structured learning approach",
                "Mentions measurable outcome",
                "Reflects on improvement"
            ],
            "weak_answer_signals": [
                "No real example",
                "Generic explanation"
            ],
            "follow_up": {
                "if_strong": {
                    "question": "What would you improve in your approach next time?",
                    "purpose": "Assess growth mindset."
                },
                "if_weak": {
                    "question": "What resources would you rely on first?",
                    "purpose": "Evaluate practical thinking."
                }
            },
            "difficulty": "behavioral"
        })

    # =========================================================
    # 7️⃣ Intelligent Fallback
    # =========================================================
    if len(selected) < max_questions:
        selected.extend(
            _format_question(q)
            for q in _choose_random(
                QUESTION_LIBRARY["general_problem_solving"], 1
            )
        )

    # =========================================================
    # Trim & Return
    # =========================================================
    return selected[:max_questions]
