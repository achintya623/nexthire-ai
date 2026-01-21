# ============================================================
# NextHire AI: Hybrid Matching Module (BGE + Skills + Roles)
# ============================================================

from sentence_transformers import SentenceTransformer, util
import numpy as np

# ------------ 1) Initialize stronger model ---------------
def init_bert_model():
    print("🔧 Loading BGE Embedding Model...")
    model = SentenceTransformer("BAAI/bge-base-en-v1.5")
    print("✅ BGE Model Ready")
    return model

# ------------ 2) Hybrid Matching Scoring -----------------
def calculate_match_score(parsed_resume, parsed_jd, model):
    resume_text = parsed_resume.get("raw_text_for_bert", "")
    jd_text = parsed_jd.get("raw_text_for_bert", "")

    emb_r = model.encode(resume_text, normalize_embeddings=True)
    emb_j = model.encode(jd_text, normalize_embeddings=True)

    # ✅ Cosine similarity
    cos_sim = float(util.cos_sim(emb_r, emb_j).item())  # [-1,1] → [0,1]
    embed_score = (cos_sim + 1) / 2

    # ✅ Skill overlap (Jaccard)
    skills_r = {s.lower() for s in parsed_resume.get("skills", [])}
    skills_j = {s.lower() for s in parsed_jd.get("required_skills", [])}
    jaccard = len(skills_r & skills_j) / max(len(skills_r | skills_j), 1)

    # ✅ Role match bonus
    roles_r = " ".join(parsed_resume.get("roles", [])).lower()
    roles_j = " ".join(parsed_jd.get("jd_roles", [])).lower()
    role_bonus = 0.08 if any(tok in roles_r for tok in roles_j.split()) else 0.0

    # ✅ Seniority penalty
    SENIORITY = {"junior":1, "mid":2, "senior":3, "lead":4}
    sr = SENIORITY.get(parsed_resume.get("seniority","mid").lower(),2)
    sj = SENIORITY.get(parsed_jd.get("required_seniority","mid").lower(),2)
    seniority_penalty = min(0.15, abs(sr-sj) * 0.05)

    # ✅ Weighted Hybrid Score
    score = (
        0.60 * embed_score +
        0.30 * jaccard +
        0.10 * role_bonus
    ) - seniority_penalty

    score = max(0.0, min(1.0, score))

    return {
        "score": round(score, 4),
        "breakdown": {
            "embedding_similarity": round(embed_score, 4),
            "skill_overlap": round(jaccard, 4),
            "role_bonus": role_bonus,
            "seniority_penalty": seniority_penalty,
        },
        "matched_skills": list(skills_r & skills_j)
    }
