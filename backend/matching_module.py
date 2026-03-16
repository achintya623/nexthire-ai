# ============================================================
# matching_module.py
# AI-powered Hybrid Matching: Semantic + Skills + Experience + Roles
# ============================================================

from typing import Dict, Any
from sentence_transformers import SentenceTransformer, util


def init_matcher_model(
    model_name: str = "sentence-transformers/all-MiniLM-L6-v2"
) -> SentenceTransformer:
    print("🔧 Loading matching embedding model...")
    model = SentenceTransformer(model_name)
    print("✅ Matching model ready")
    return model


def normalize_skill(skill: str) -> str:
    return (
        skill.lower()
        .strip()
        .replace(" ", "")
        .replace("/", "")
        .replace("-", "")
    )


def calculate_match_score(
    parsed_resume: Dict[str, Any],
    parsed_jd: Dict[str, Any],
    model: SentenceTransformer  # reserved for future use
) -> Dict[str, Any]:

    # --------------------------------------------------
    # 1. Semantic similarity
    # --------------------------------------------------
    emb_r = parsed_resume.get("embedding")
    emb_j = parsed_jd.get("embedding")

    if emb_r and emb_j:
        cos = float(util.cos_sim(emb_r, emb_j).item())
        semantic_score = (cos + 1) / 2
    else:
        semantic_score = 0.0

    # --------------------------------------------------
    # 2. Skill matching
    # --------------------------------------------------
    resume_skills = {normalize_skill(s): s for s in parsed_resume.get("skills", [])}
    required_skills = {normalize_skill(s): s for s in parsed_jd.get("required_skills", [])}
    optional_skills = {normalize_skill(s): s for s in parsed_jd.get("optional_skills", [])}

    resume_keys = set(resume_skills)
    required_keys = set(required_skills)
    optional_keys = set(optional_skills)

    matched_required = resume_keys & required_keys
    missing_required = required_keys - resume_keys
    matched_optional = resume_keys & optional_keys

    # --------------------------------------------------
    # 3. Skill score
    # --------------------------------------------------
    if required_keys:
        required_coverage = len(matched_required) / len(required_keys)
    else:
        required_coverage = 0.7

    # Prevent semantic-only inflation
    if semantic_score > 0.75 and required_coverage < 0.65:
        required_coverage = 0.65

    optional_coverage = (
        len(matched_optional) / len(optional_keys)
        if optional_keys else 0.0
    )

    skill_score = (0.8 * required_coverage) + (0.2 * optional_coverage)

    # Relaxed ceiling (lets strong candidates breathe)
    skill_ceiling = 0.75 + (0.25 * required_coverage)

    # --------------------------------------------------
    # 4. Experience alignment
    # --------------------------------------------------
    yrs_r = parsed_resume.get("experience_years")
    yrs_j = parsed_jd.get("required_years")

    if isinstance(yrs_r, int) and isinstance(yrs_j, int):
        diff = yrs_r - yrs_j
        exp_score = 1.0 if diff >= 0 else max(0.6, 1 + diff * 0.1)
    else:
        exp_score = 0.7

    # --------------------------------------------------
    # 5. Role alignment (soft)
    # --------------------------------------------------
    resume_roles = " ".join(parsed_resume.get("roles", [])).lower()
    jd_roles = " ".join(parsed_jd.get("jd_roles", [])).lower()

    role_match = False
    if resume_roles and jd_roles:
        role_match = resume_roles in jd_roles or jd_roles in resume_roles

    role_penalty = 0.04 if jd_roles and not role_match else 0.0

    # --------------------------------------------------
    # 6. Missing skill penalty (lighter)
    # --------------------------------------------------
    missing_ratio = len(missing_required) / len(required_keys) if required_keys else 0.0
    missing_penalty = min(0.08, missing_ratio * 0.15)

    # --------------------------------------------------
    # 7. Final score
    # --------------------------------------------------
    raw_score = (
        0.50 * skill_score +
        0.30 * semantic_score +
        0.15 * exp_score +
        (0.05 if role_match else 0.0)
    )

    final_score = raw_score * skill_ceiling

    # Reduced total penalty
    total_penalty = min(0.10, missing_penalty + role_penalty)
    final_score -= total_penalty

    # Seniority soft bonus (real-world hiring behavior)
    if required_coverage >= 0.85 and exp_score >= 0.9:
        final_score += 0.05

    final_score = max(0.0, min(1.0, final_score))

    # --------------------------------------------------
    # 8. Reasoning
    # --------------------------------------------------
    reasoning = []

    if matched_required:
        reasoning.append(
            f"Matched {len(matched_required)}/{len(required_keys)} required skills: " +
            ", ".join(sorted(required_skills[k] for k in matched_required)[:6])
        )

    if missing_required and required_coverage < 0.85:
        reasoning.append(
            "Missing required skills: " +
            ", ".join(sorted(required_skills[k] for k in missing_required)[:6])
        )

    if role_match:
        reasoning.append("Role alignment detected.")
    elif jd_roles:
        reasoning.append("Role alignment not detected.")

    if exp_score < 0.9:
        reasoning.append("Experience slightly below requirement.")

    if not reasoning:
        reasoning.append("Overall semantic and skill alignment detected.")

    confidence = round(
        (0.5 * skill_score) +
        (0.3 * semantic_score) +
        (0.2 * exp_score),
        3
    )

    return {
        "final_score": round(final_score, 4),
        "semantic_score": round(semantic_score, 4),
        "skill_score": round(skill_score, 4),
        "experience_score": round(exp_score, 4),
        "role_match": role_match,
        "matched_required_skills": sorted(required_skills[k] for k in matched_required)[:10],
        "matched_optional_skills": sorted(optional_skills[k] for k in matched_optional)[:10],
        "missing_required_skills": sorted(required_skills[k] for k in missing_required)[:10],
        "reasoning": " | ".join(reasoning),
        "confidence_score": confidence
    }
