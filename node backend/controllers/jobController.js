const pool = require("../db");

exports.createJob = async (req, res) => {
  try {
    const { title, description } = req.body;

    const job = await pool.query(
      `
      INSERT INTO jobs(user_id,title,description)
      VALUES($1,$2,$3)
      RETURNING *
      `,
      [req.user.userId, title, description],
    );

    res.json(job.rows[0]);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Failed to create job",
    });
  }
};

exports.getJobs = async (req, res) => {
  try {
    const jobs = await pool.query(
      "SELECT * FROM jobs WHERE user_id=$1 ORDER BY created_at DESC",
      [req.user.userId],
    );

    res.json(jobs.rows);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Failed to load jobs",
    });
  }
};

exports.deleteJob = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query("DELETE FROM jobs WHERE id=$1 AND user_id=$2", [
      id,
      req.user.userId,
    ]);

    res.json({ message: "Job deleted" });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Failed to delete job",
    });
  }
};
