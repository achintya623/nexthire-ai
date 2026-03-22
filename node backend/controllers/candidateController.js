const pool = require("../db");
const axios = require("axios");

const allowedStages = [
  "Applied",
  "Shortlisted",
  "Interview",
  "Offer",
  "Hired",
  "Rejected",
];

// Creates a candidate record linked to a job.
exports.addCandidate = async (req, res) => {
  try {
    const { job_id, name, email, resume_text } = req.body;

    if (!job_id || !resume_text) {
      return res.status(400).json({
        error: "Missing required fields",
      });
    }

    const candidate = await pool.query(
      "INSERT INTO candidates(job_id,name,email,resume_text) VALUES($1,$2,$3,$4) RETURNING *",
      [job_id, name, email, resume_text],
    );

    return res.json(candidate.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to add candidate" });
  }
};

// Returns all candidates and their reports for a given job.
exports.getCandidates = async (req, res) => {
  try {
    const { jobId } = req.params;

    const result = await pool.query(
      `
      SELECT
        c.id,
        c.name,
        c.email,
        c.ai_score,
        c.risk_level,
        c.recommendation,
        c.stage,
        r.report_json
      FROM candidates c
      LEFT JOIN reports r
      ON r.candidate_id = c.id
      WHERE c.job_id=$1
      ORDER BY c.ai_score DESC NULLS LAST
      `,
      [jobId],
    );

    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load candidates" });
  }
};

// Runs screening and interview analysis, then stores the combined report.
exports.analyzeCandidate = async (req, res) => {
  try {
    const { id } = req.params;

    const candidate = await pool.query("SELECT * FROM candidates WHERE id=$1", [
      id,
    ]);

    if (candidate.rows.length === 0) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    const resumeText = candidate.rows[0].resume_text;
    const jobId = candidate.rows[0].job_id;

    const job = await pool.query("SELECT * FROM jobs WHERE id=$1", [jobId]);
    const jdText = job.rows[0].description;

    const screening = await axios.post(`${process.env.FLASK_API}/match`, {
      resume_text: resumeText,
      jd_text: jdText,
    });

    const interview = await axios.post(
      `${process.env.FLASK_API}/interview/assistant`,
      {
        resume_text: resumeText,
        jd_text: jdText,
      },
    );

    const report = {
      screening: screening.data,
      interview: interview.data,
    };

    const score = screening.data.match.final_score * 100;

    await pool.query("UPDATE candidates SET ai_score=$1 WHERE id=$2", [
      score,
      id,
    ]);

    await pool.query(
      `
      INSERT INTO reports(candidate_id, report_json)
      VALUES ($1, $2)
      ON CONFLICT (candidate_id)
      DO UPDATE SET report_json = EXCLUDED.report_json
      `,
      [id, report],
    );

    return res.json(report);
  } catch (err) {
    console.error("AI analysis failed:", err.message);
    return res.status(500).json({ error: "Analysis failed" });
  }
};

// Returns a stored report for one candidate.
exports.getReport = async (req, res) => {
  try {
    const { id } = req.params;

    const report = await pool.query(
      "SELECT report_json FROM reports WHERE candidate_id=$1",
      [id],
    );

    if (!report.rows.length) {
      return res.status(404).json({
        error: "Report not found",
      });
    }

    return res.json(report.rows[0].report_json);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load report" });
  }
};

// Updates the hiring stage for a candidate.
exports.updateStage = async (req, res) => {
  try {
    const { id } = req.params;
    const { stage } = req.body;

    if (!allowedStages.includes(stage)) {
      return res.status(400).json({
        error: "Invalid stage",
      });
    }

    const result = await pool.query(
      `
      UPDATE candidates
      SET stage=$1
      WHERE id=$2
      RETURNING *
      `,
      [stage, id],
    );

    return res.json(result.rows[0]);
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: "Failed to update stage",
    });
  }
};
