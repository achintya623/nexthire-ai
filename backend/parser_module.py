# ==============================================================
# parser_module.py
# Resume & JD parsing → structured + embeddings + domain score
# ==============================================================

import re
from typing import Dict, Any, List, Tuple

import spacy
from spacy.matcher import Matcher
from rapidfuzz import process, fuzz
from sentence_transformers import SentenceTransformer, util

from skill_library import MASTER_SKILL_LIBRARY
from bias_protection import scrub_structured, scrub_text

# ---------- Initialization (call once in app.py) ----------

def init_nlp() -> Tuple[spacy.language.Language, Matcher]:
    nlp = spacy.load("en_core_web_sm")
    matcher = Matcher(nlp.vocab)
    # Email & phone
    matcher.add("EMAIL", [[{"LIKE_EMAIL": True}]])
    # US 555-123-4567 or 555 123 4567 or (555) 123-4567
    phone_pattern = [[
        {"TEXT": {"REGEX": r"^(\+?\d{1,3}[\s\-]?)?(\(?\d{2,4}\)?[\s\-]?)?\d{3,4}[\s\-]?\d{3,4}$"}}
    ]]
    matcher.add("PHONE", phone_pattern)
    return nlp, matcher

def init_embedder(model_name: str = "sentence-transformers/all-MiniLM-L6-v2") -> SentenceTransformer:
    return SentenceTransformer(model_name)

# ---------- Helpers ----------

SECTION_HEADERS = [
    "summary", "objective", "experience", "work experience", "professional experience",
    "projects", "education", "skills", "certifications", "achievements",
    "awards", "publications", "volunteer", "interests"
]

ROLE_HINTS = [
    "engineer", "developer", "scientist", "analyst", "manager", "designer",
    "consultant", "administrator", "architect", "lead", "specialist"
]

def split_sections(raw: str) -> Dict[str, str]:
    sections = {}
    current = "other"
    sections[current] = ""
    for line in raw.splitlines():
        h = line.strip().lower()
        if h in SECTION_HEADERS:
            current = h
            sections[current] = ""
        else:
            sections[current] += (line + " ")
    # trim
    for k in list(sections.keys()):
        sections[k] = sections[k].strip()
        if not sections[k]:
            sections.pop(k, None)
    return sections

def extract_contact(doc: spacy.tokens.Doc, matcher: Matcher) -> Dict[str, str]:
    out = {"name": "N/A", "email": "N/A", "phone": "N/A"}
    # name: first PERSON entity
    for ent in doc.ents:
        if ent.label_ == "PERSON":
            out["name"] = ent.text
            break
    # matcher for email/phone
    for mid, start, end in matcher(doc):
        label = doc.vocab.strings[mid]
        span = doc[start:end].text
        if label == "EMAIL":
            out["email"] = span
        elif label == "PHONE":
            # light normalization
            out["phone"] = re.sub(r"\s+", " ", span)
    return out

def extract_years_experience(text: str) -> str:
    m = re.search(r"(\d+)\+?\s+years?", text.lower())
    return m.group(1) if m else "N/A"

def extract_roles(doc: spacy.tokens.Doc) -> List[str]:
    roles = set()
    for chunk in doc.noun_chunks:
        s = chunk.text.strip()
        if any(h in s.lower() for h in ROLE_HINTS) and 2 <= len(s) <= 80:
            roles.add(s)
    # also pick possible titles from entities
    for ent in doc.ents:
        if ent.label_ in ("ORG", "WORK_OF_ART"):
            continue
        s = ent.text.strip()
        if any(h in s.lower() for h in ROLE_HINTS):
            roles.add(s)
    return sorted(roles)

def fuzzy_skills(text: str, top_k: int = 200, threshold: int = 85) -> List[str]:
    # Match skills using fuzzy partial_ratio; keep high-confidence
    results = process.extract(
        text.lower(),
        MASTER_SKILL_LIBRARY,
        scorer=fuzz.partial_ratio,
        limit=top_k
    )
    return sorted({skill.title() for skill, score, _ in results if score >= threshold})

def dedupe_keepcase(items: List[str]) -> List[str]:
    seen = set()
    out = []
    for x in items:
        xl = x.lower()
        if xl not in seen:
            seen.add(xl)
            out.append(x)
    return out

# ---------- Public: Parse Resume ----------

def parse_resume(raw_text: str, nlp: spacy.language.Language, matcher: Matcher,
                 embedder: SentenceTransformer) -> Dict[str, Any]:
    raw_text = raw_text.strip()
    # scrub sensitive signals pre-analysis (do not lose skills)
    scrubbed_for_embedding = scrub_text(raw_text)

    sections = split_sections(raw_text)
    doc = nlp(raw_text)

    contact = extract_contact(doc, matcher)
    roles = extract_roles(doc)
    years = extract_years_experience(raw_text)
    skills = fuzzy_skills(raw_text)

    # embedding on scrubbed text (privacy-preserving)
    emb = embedder.encode([scrubbed_for_embedding], normalize_embeddings=True)[0].tolist()

    structured = {
        "candidate_info": contact,
        "experience_years": years,
        "roles": roles,
        "skills": dedupe_keepcase(skills),
        "sections": sections,
        "embedding": emb,              # 384-dim for MiniLM
        "raw_text_for_bert": raw_text  # keep original for audits
    }

    return scrub_structured(structured)  # scrub strings inside structure

# ---------- Public: Parse JD ----------

def parse_jd(raw_text: str, nlp: spacy.language.Language,
             embedder: SentenceTransformer) -> Dict[str, Any]:
    raw_text = raw_text.strip()
    scrubbed_for_embedding = scrub_text(raw_text)

    sections = split_sections(raw_text)  # often has Responsibilities/Requirements
    doc = nlp(raw_text)

    # JD roles (from title lines or detected noun phrases)
    roles = extract_roles(doc)

    # Required years (if any)
    years = extract_years_experience(raw_text)

    # Required skills (fuzzy)
    skills = fuzzy_skills(raw_text)

    emb = embedder.encode([scrubbed_for_embedding], normalize_embeddings=True)[0].tolist()

    structured = {
        "jd_roles": roles,
        "required_years": years,
        "required_skills": dedupe_keepcase(skills),
        "sections": sections,
        "embedding": emb,
        "raw_text_for_bert": raw_text
    }
    return scrub_structured(structured)

# ---------- Public: Compute Domain Match (Resume ↔ JD) ----------

def calculate_match_score(parsed_resume: Dict[str, Any], parsed_jd: Dict[str, Any]) -> Dict[str, Any]:
    """
    Final scoring — domain-first scoring model.
    Penalizes wrong-role candidates and rewards TRUE alignment.
    """

    # Extract data
    rs = {s.lower() for s in parsed_resume.get("skills", [])}
    js = {s.lower() for s in parsed_jd.get("required_skills", [])}
    matched_skills = sorted(list(rs & js))
    missing_skills = sorted(list(js - rs))

    # Semantic similarity
    emb_r = parsed_resume.get("embedding")
    emb_j = parsed_jd.get("embedding")
    cos = float(util.cos_sim(emb_r, emb_j).item()) if emb_r and emb_j else 0.0
    semantic_score = (cos + 1) / 2  # normalized

    # Role Alignment
    resume_roles = " ".join(parsed_resume.get("roles", [])).lower()
    jd_roles = " ".join(parsed_jd.get("jd_roles", [])).lower()
    role_match = any(tok in resume_roles for tok in jd_roles.split())

    # Experience
    yrs_r = parsed_resume.get("experience_years")
    yrs_j = parsed_jd.get("required_years")
    if yrs_r.isdigit() and yrs_j.isdigit():
        exp_diff = int(yrs_r) - int(yrs_j)
        exp_score = max(0.0, 1.0 if exp_diff >= 0 else 1 + exp_diff * 0.25)
    else:
        exp_score = 0.7

    # Domain classifier (critical)
    domain_keywords = {"data", "analytics", "sql", "excel", "tableau", "power bi"}
    domain_match = any(k in rs for k in domain_keywords)

    # 🚫 Hard fail if domain mismatch
    if not domain_match:
        return {
            "domain_match_score": 0.05,
            "semantic_score": round(semantic_score, 4),
            "skill_overlap_score": 0,
            "experience_score": exp_score,
            "role_match": role_match,
            "top_skills_matched": [],
            "top_skills_missing": list(js),
            "reasoning": "Domain mismatch — core skills missing (SQL/Data/BI).",
            "confidence_score": 0.3
        }

    # Weighted final score (domain-first)
    skill_overlap = len(matched_skills) / len(js) if js else 0
    final_score = (
        0.50 * skill_overlap +
        0.25 * semantic_score +
        0.20 * exp_score +
        0.05 * (1 if role_match else 0)
    )

    final_score = max(0.0, min(1.0, final_score))

    reasoning = []
    if matched_skills:
        reasoning.append("Matched skills: " + ", ".join(matched_skills[:5]))
    if missing_skills:
        reasoning.append("Missing: " + ", ".join(missing_skills[:5]))
    if role_match:
        reasoning.append("Relevant role detected.")
    if exp_score < 1:
        reasoning.append("Experience slightly below requirement.")

    if not reasoning:
        reasoning.append("Relevant overlap detected.")

    confidence = round(
        (0.6 * skill_overlap) + (0.2 * exp_score) + (0.2 * semantic_score),
        3
    )

    return {
        "domain_match_score": round(final_score, 4),
        "semantic_score": round(semantic_score, 4),
        "skill_overlap_score": round(skill_overlap, 4),
        "experience_score": round(exp_score, 4),
        "role_match": role_match,
        "top_skills_matched": matched_skills[:7],
        "top_skills_missing": missing_skills[:7],
        "reasoning": " | ".join(reasoning),
        "confidence_score": confidence
    }
