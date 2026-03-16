const pool = require("../db");
const axios = require("axios");

exports.addCandidate = async (req, res) => {
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

  res.json(candidate.rows[0]);
};

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

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load candidates" });
  }
};

exports.analyzeCandidate = async (req, res) => {
  try {
    const { id } = req.params;

    // get candidate
    const candidate = await pool.query("SELECT * FROM candidates WHERE id=$1", [
      id,
    ]);

    if (candidate.rows.length === 0) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    const resume_text = candidate.rows[0].resume_text;
    const job_id = candidate.rows[0].job_id;

    // get job description
    const job = await pool.query("SELECT * FROM jobs WHERE id=$1", [job_id]);

    const jd_text = job.rows[0].description;

    // -----------------------------
    // 1️⃣ Screening Analysis
    // -----------------------------
    const screening = await axios.post(`${process.env.FLASK_API}/match`, {
      resume_text,
      jd_text,
    });

    // -----------------------------
    // 2️⃣ Interview Assistant
    // -----------------------------
    const interview = await axios.post(
      `${process.env.FLASK_API}/interview/assistant`,
      {
        resume_text,
        jd_text,
      },
    );

    // -----------------------------
    // 3️⃣ Combine reports
    // -----------------------------
    const report = {
      screening: screening.data,
      interview: interview.data,
    };

    // -----------------------------
    // 4️⃣ Update candidate score
    // -----------------------------
    const score = screening.data.match.final_score * 100;

    await pool.query("UPDATE candidates SET ai_score=$1 WHERE id=$2", [
      score,
      id,
    ]);

    // -----------------------------
    // 5️⃣ Save report
    // -----------------------------
    await pool.query(
      `
INSERT INTO reports(candidate_id, report_json)
VALUES ($1, $2)
ON CONFLICT (candidate_id)
DO UPDATE SET report_json = EXCLUDED.report_json
`,
      [id, report],
    );

    res.json(report);
  } catch (err) {
    console.error("AI analysis failed:", err.message);
    res.status(500).json({ error: "Analysis failed" });
  }
};

exports.getReport = async (req, res) => {
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

  res.json(report.rows[0].report_json);
};

exports.updateStage = async (req, res) => {
  try {
    const { id } = req.params;
    const { stage } = req.body;

    const allowedStages = [
      "Applied",
      "Shortlisted",
      "Interview",
      "Offer",
      "Hired",
      "Rejected",
    ];

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

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Failed to update stage",
    });
  }
};
