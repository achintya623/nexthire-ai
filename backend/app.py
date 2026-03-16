from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
import os
from dotenv import load_dotenv

load_dotenv()

from parser_module import (
    init_nlp,
    init_embedder,
    parse_resume,
    parse_jd,
)

from matching_module import calculate_match_score
from bias_audit import compute_bias_risk

# 🧠 Interview Assistant modules
from interview_focus import determine_interview_focus
from interview_insights import generate_interview_insights
from readiness_analyzer import analyze_readiness
from recommendation_engine import generate_recommendation
from question_selector import select_interview_questions


# ----------------- App setup -----------------

app = Flask(__name__)
CORS(
    app,
    resources={r"/*": {"origins": "*"}},
    supports_credentials=True
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)

nlp = matcher = embedder = None


# ----------------- Model loading -----------------

def load_models():
    global nlp, matcher, embedder
    if nlp is None or embedder is None:
        logger.info("Initializing NLP & embedding models...")
        nlp, matcher = init_nlp()
        embedder = init_embedder()
        logger.info("Models loaded successfully")


logger.info("Booting app – loading models once at startup")
load_models()


# ----------------- Health -----------------

@app.route("/", methods=["GET"])
def home():
    return jsonify({"status": "NextHire AI Backend Running ✅"})


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "models_loaded": nlp is not None and embedder is not None
    })


# ----------------- Parsing -----------------

@app.route("/parse_resume", methods=["POST"])
def api_parse_resume():
    data = request.get_json(force=True)
    text = data.get("text", "")

    if not text or len(text.strip()) < 50:
        return jsonify({"error": "Empty or invalid resume text"}), 400

    return jsonify(parse_resume(text, nlp, matcher, embedder))


@app.route("/parse_jd", methods=["POST"])
def api_parse_jd():
    data = request.get_json(force=True)
    text = data.get("text", "")

    if not text or len(text.strip()) < 50:
        return jsonify({"error": "Empty or invalid job description"}), 400

    return jsonify(parse_jd(text, nlp, embedder))


# ----------------- Matching -----------------

@app.route("/match", methods=["POST"])
def api_match():
    data = request.get_json(force=True)

    resume_text = data.get("resume_text")
    jd_text = data.get("jd_text")

    if not resume_text or not jd_text:
        return jsonify({"error": "Resume text and JD text are required"}), 400

    parsed_resume = parse_resume(resume_text, nlp, matcher, embedder)
    parsed_jd = parse_jd(jd_text, nlp, embedder)

    match = calculate_match_score(parsed_resume, parsed_jd, embedder)
    bias = compute_bias_risk(parsed_resume)

    return jsonify({
        "parsed_resume": parsed_resume,
        "parsed_jd": parsed_jd,
        "match": match,
        "bias": bias
    })


# ============================================================
# 🧠 FULL INTERVIEW ASSISTANT (HR-ONLY)
# ============================================================

@app.route("/interview/assistant", methods=["POST", "OPTIONS"])
def interview_assistant():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200

    data = request.get_json(force=True)

    resume_text = data.get("resume_text")
    jd_text = data.get("jd_text")

    if not resume_text or not jd_text:
        return jsonify({"error": "resume_text and jd_text are required"}), 400

    # -------------------------
    # Parse
    # -------------------------
    parsed_resume = parse_resume(resume_text, nlp, matcher, embedder)
    parsed_jd = parse_jd(jd_text, nlp, embedder)

    # -------------------------
    # Match & bias
    # -------------------------
    match = calculate_match_score(parsed_resume, parsed_jd, embedder)
    bias = compute_bias_risk(parsed_resume)

    # -------------------------
    # Interview intelligence
    # -------------------------
    interview_focus = determine_interview_focus(
        parsed_resume=parsed_resume,
        parsed_jd=parsed_jd,
        match_result=match
    )

    interview_insights = generate_interview_insights(
        parsed_resume=parsed_resume,
        parsed_jd=parsed_jd,
        match_result=match,
        interview_focus=interview_focus
    )


    readiness = analyze_readiness(
        parsed_resume=parsed_resume,
        parsed_jd=parsed_jd,
        match_result=match
    )

    skill_analysis = {
        "required_matched": len(match.get("matched_required_skills", [])),
        "required_total": len(parsed_jd.get("required_skills", [])),
        "optional_matched": len(match.get("matched_optional_skills", [])),
        "optional_total": len(parsed_jd.get("optional_skills", []))
    }

    experience_analysis = {
        "required_years": parsed_jd.get("required_years"),
        "candidate_years": parsed_resume.get("experience_years")
    }

    risk_score = (
        len(match.get("missing_required_skills", [])) * 0.15 +
        (0.2 if match.get("experience_score", 1) < 0.75 else 0)
    )

    risk_level = (
        "Low" if risk_score < 0.2
        else "Moderate" if risk_score < 0.4
        else "High"
    )

    risk_assessment = {
        "risk_score": round(risk_score, 2),
        "risk_level": risk_level
    }

    if match["final_score"] >= 0.85:
        interview_strategy = "Depth Validation Interview"
    elif match["final_score"] >= 0.7:
        interview_strategy = "Focused Validation Interview"
    elif match["final_score"] >= 0.55:
        interview_strategy = "Risk Reduction Interview"
    else:
        interview_strategy = "Screening Interview"

    interview_objective = (
        f"This interview should focus on validating architectural depth, "
        f"decision-making quality, and ownership maturity. "
        f"Overall risk level is {risk_level.lower()}."
    )

    yrs = parsed_resume.get("experience_years") or 0

    if yrs >= 7:
        complexity = "Senior+ Strategic"
    elif yrs >= 4:
        complexity = "Senior Specialist"
    elif yrs >= 2:
        complexity = "Mid-Level"
    else:
        complexity = "Junior"


    interview_questions = select_interview_questions(match)


    recommendation = generate_recommendation(
        parsed_resume=parsed_resume,
        parsed_jd=parsed_jd,
        match_result=match,
        interview_focus=interview_focus,
        interview_insight=interview_insights,
        readiness=readiness,
        bias=bias
    )


    # Defensive guard (prevents 500s)
    if not isinstance(interview_focus, dict):
        interview_focus = {}

    # Normalize interview focus for frontend
    FOCUS_DESCRIPTIONS = {
        "core_fundamentals": "Validate depth in core technical fundamentals.",
        "missing_required_skills": "Clarify gaps in required skills.",
        "architecture_and_decisions": "Test architectural thinking and trade-off awareness.",
        "experience_validation": "Validate real-world experience depth.",
        "role_clarity": "Ensure role alignment with job expectations.",
        "system_design_light": "Probe high-level system design ability.",
        "general_problem_solving": "Assess structured problem-solving ability."
    }

    focus_areas = []

    for key in interview_focus.get("focus_areas", []):
        focus_areas.append({
            "key": key,
            "title": key.replace("_", " ").title(),
            "description": FOCUS_DESCRIPTIONS.get(key, ""),
            "priority": "High" if key in {"architecture_and_decisions", "missing_required_skills"} else "Medium"
        })


    return jsonify({
        "ai_confidence_meter": recommendation.get("ai_confidence_meter"),
        "interview_summary": interview_insights.get("summary"),
        "positive_signals": interview_insights.get("positive_signals"),
        "risk_signals": interview_insights.get("risk_signals"),
        "suggested_probes": interview_insights.get("suggested_probes"),
        "readiness_checklist": readiness,
        "interview_focus_areas": focus_areas,
        "final_recommendation": recommendation,
        "interview_questions": interview_questions,
        "skill_analysis": skill_analysis,
        "experience_analysis": experience_analysis,
        "risk_assessment": risk_assessment,
        "interview_strategy": interview_strategy,
        "interview_objective": interview_objective,
        "candidate_complexity": complexity,
    }), 200




# ----------------- Run -----------------

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    app.run(port=port, debug=False)
