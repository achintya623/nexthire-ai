# ==============================================================
# parser_module.py
# Resume & JD parsing → structured + embeddings
# ==============================================================

import re
from typing import Dict, Any, List, Tuple

import spacy
from spacy.matcher import Matcher
from sentence_transformers import SentenceTransformer

from skill_library import MASTER_SKILL_LIBRARY, SKILL_ALIASES
from bias_protection import scrub_structured, scrub_text

# ---------- Initialization (call once in app.py) ----------

def init_nlp() -> Tuple[spacy.language.Language, Matcher]:
    nlp = spacy.load("en_core_web_sm")
    matcher = Matcher(nlp.vocab)

    matcher.add("EMAIL", [[{"LIKE_EMAIL": True}]])
    matcher.add(
        "PHONE",
        [[{
            "TEXT": {
                "REGEX": r"^(\+?\d{1,3}[\s\-]?)?(\(?\d{2,4}\)?[\s\-]?)?\d{3,4}[\s\-]?\d{3,4}$"
            }
        }]]
    )

    return nlp, matcher


def init_embedder(
    model_name: str = "sentence-transformers/all-MiniLM-L6-v2"
) -> SentenceTransformer:
    return SentenceTransformer(model_name)

# ---------- Constants ----------

SECTION_HEADERS = [
    "summary", "objective", "experience", "work experience",
    "professional experience", "projects", "education", "skills",
    "certifications", "achievements", "awards", "publications",
    "volunteer", "interests", "requirements", "qualifications",
    "responsibilities", "preferred qualifications", "nice to have"
]

ROLE_HINTS = [
    "engineer", "developer", "scientist", "analyst", "manager",
    "designer", "consultant", "administrator", "architect",
    "lead", "specialist"
]

# ---------- Skill Normalization ----------

def normalize_and_canonicalize(skill: str) -> str:
    """
    Returns a human-readable canonical skill.
    Never remove spaces here.
    """
    s = skill.lower().strip()

    for canonical, aliases in SKILL_ALIASES.items():
        if s == canonical or s in aliases:
            return canonical

    return s


# ---------- Skill Extraction ----------

def fuzzy_skills(text: str) -> List[str]:
    """
    Exact phrase matching against master skill library.
    Returns canonical, readable skill names.
    """
    text = text.lower()
    matches = set()

    for skill in MASTER_SKILL_LIBRARY:
        skill_norm = re.escape(skill.lower())
        pattern = rf"(?<![a-z0-9]){skill_norm}(?![a-z0-9])"

        if re.search(pattern, text):
            matches.add(normalize_and_canonicalize(skill))

    return sorted(matches)


# ---------- Section Parsing ----------

def split_sections(raw: str) -> Dict[str, str]:
    sections = {"other": ""}
    current = "other"

    for line in raw.splitlines():
        line_stripped = line.strip()
        header = line_stripped.lower().rstrip(":")

        if header in SECTION_HEADERS:
            current = header
            sections[current] = ""
        else:
            sections[current] += line + " "

    return {k: v.strip() for k, v in sections.items() if v.strip()}


# ---------- Entity Extraction ----------

def extract_contact(doc: spacy.tokens.Doc, matcher: Matcher) -> Dict[str, str]:
    out = {"name": "N/A", "email": "N/A", "phone": "N/A"}

    for ent in doc.ents:
        if ent.label_ == "PERSON":
            out["name"] = ent.text
            break

    for mid, start, end in matcher(doc):
        label = doc.vocab.strings[mid]
        span = doc[start:end].text
        if label == "EMAIL":
            out["email"] = span
        elif label == "PHONE":
            out["phone"] = re.sub(r"\s+", " ", span)

    return out


def extract_years_experience(text: str):
    text = text.lower()

    m = re.search(r"(\d+)\s*[-–]\s*(\d+)\s+years?", text)
    if m:
        return int(m.group(2))

    m = re.search(r"(over\s+)?(\d+)\+?\s+years?", text)
    if m:
        return int(m.group(2))

    return None


def extract_roles(doc: spacy.tokens.Doc) -> List[str]:
    roles = set()

    for chunk in doc.noun_chunks:
        s = chunk.text.strip()
        if any(h in s.lower() for h in ROLE_HINTS):
            roles.add(s)

    for ent in doc.ents:
        if ent.label_ not in ("ORG", "WORK_OF_ART"):
            s = ent.text.strip()
            if any(h in s.lower() for h in ROLE_HINTS):
                roles.add(s)

    return sorted(roles)


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

def parse_resume(raw_text: str, nlp, matcher, embedder):
    raw_text = raw_text.strip()
    scrubbed_for_embedding = scrub_text(raw_text)

    sections = split_sections(raw_text)
    doc = nlp(raw_text)

    skills = dedupe_keepcase([
        normalize_and_canonicalize(s)
        for s in fuzzy_skills(raw_text)
    ])

    if not skills and "other" in sections:
        skills = dedupe_keepcase([
            normalize_and_canonicalize(s)
            for s in fuzzy_skills(sections["other"])
        ])

    structured = {
        "candidate_info": extract_contact(doc, matcher),
        "experience_years": extract_years_experience(raw_text),
        "roles": extract_roles(doc),
        "skills": skills,
        "sections": sections,
        "embedding": embedder.encode(
            [scrubbed_for_embedding],
            normalize_embeddings=True
        )[0].tolist(),
        "raw_text_for_bert": raw_text
    }

    return scrub_structured(structured)

# ---------- Public: Parse JD ----------

def parse_jd(raw_text: str, nlp, embedder):
    raw_text = raw_text.strip()
    scrubbed_for_embedding = scrub_text(raw_text)

    sections = split_sections(raw_text)
    doc = nlp(raw_text)

    required_skills = set()
    optional_skills = set()

    for title, content in sections.items():
        title_l = title.lower()
        skills = {
            normalize_and_canonicalize(s)
            for s in fuzzy_skills(content)
        }

        if any(k in title_l for k in ["require", "qualification", "must have"]):
            required_skills |= skills
        elif any(k in title_l for k in ["nice", "preferred", "optional"]):
            optional_skills |= skills

    if not required_skills:
        required_skills = {
            normalize_and_canonicalize(s)
            for s in fuzzy_skills(raw_text)
        }

    structured = {
        "jd_roles": extract_roles(doc),
        "required_years": extract_years_experience(raw_text),
        "required_skills": sorted(required_skills),
        "optional_skills": sorted(optional_skills),
        "sections": sections,
        "embedding": embedder.encode(
            [scrubbed_for_embedding],
            normalize_embeddings=True
        )[0].tolist(),
        "raw_text_for_bert": raw_text
    }

    return scrub_structured(structured)
