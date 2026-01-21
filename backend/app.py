
from flask import Flask, request, jsonify
from flask_cors import CORS
import logging


from parser_module import (
    init_nlp,
    init_embedder,
    parse_resume,
    parse_jd,
    calculate_match_score
)


app = Flask(__name__)
CORS(app)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)

logger = logging.getLogger(__name__)

nlp = matcher = embedder = None

def load_models():
    global nlp, matcher, embedder
    if nlp is None:
        logger.info("Initializing NLP & embedding models...")
        nlp, matcher = init_nlp()
        embedder = init_embedder()
        logger.info("Models loaded successfully")





@app.route("/parse_resume", methods=["POST"])
def api_parse_resume():
    load_models()
    logger.info("POST /parse_resume")

    data = request.get_json(force=True)
    text = data.get("text", "")

    if not text or len(text.strip()) < 50:
        logger.warning("Resume text too short or empty")
        return jsonify({"error": "Empty or invalid resume text"}), 400

    parsed = parse_resume(text, nlp, matcher, embedder)
    return jsonify(parsed)




@app.route("/parse_jd", methods=["POST"])
def api_parse_jd():
    load_models()
    logger.info("POST /parse_jd")

    data = request.get_json(force=True)
    text = data.get("text", "")

    if not text or len(text.strip()) < 50:
        logger.warning("JD text too short or empty")
        return jsonify({"error": "Empty or invalid job description"}), 400

    parsed = parse_jd(text, nlp, embedder)
    return jsonify(parsed)




@app.route("/match", methods=["POST"])
def api_match():
    load_models()
    data = request.get_json(force=True)

    resume_text = data.get("resume_text", "")
    jd_text = data.get("jd_text", "")

    parsed_resume = parse_resume(resume_text, nlp, matcher, embedder)
    parsed_jd = parse_jd(jd_text, nlp, embedder)

    match_result = calculate_match_score(parsed_resume, parsed_jd)

    # ✅ Step 3: Return everything needed by frontend
    return jsonify({
        "parsed_resume": parsed_resume,
        "parsed_jd": parsed_jd,
        "match": match_result
    })



@app.route("/", methods=["GET"])
def home():
    return jsonify({"status": "NextHire AI Backend Running ✅"})

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "models_loaded": nlp is not None
    })



@app.route("/debug", methods=["GET"])
def debug():
    return {"status": "backend alive"}

if __name__ == "__main__":
    app.run(port=8000, debug=False)
