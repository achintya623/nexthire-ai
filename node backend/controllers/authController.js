const pool = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

// Creates a human-readable display name from an email local part.
const formatDisplayName = (email = "") => {
  const local = String(email).split("@")[0] || "Recruiter";
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

// Hashes reset tokens before storing them in the database.
const hashResetToken = (token) =>
  crypto.createHash("sha256").update(String(token)).digest("hex");

// Registers a new user with a hashed password.
exports.register = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const hash = await bcrypt.hash(password, 10);

    const user = await pool.query(
      "INSERT INTO users(email,password) VALUES($1,$2) RETURNING id",
      [email, hash],
    );

    return res.json(user.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ error: "Email already registered" });
    }

    console.error("Register error:", error);
    return res.status(500).json({ error: "Registration failed" });
  }
};

// Authenticates a user and returns a signed JWT plus profile payload.
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query("SELECT * FROM users WHERE email=$1", [
      email,
    ]);

    if (!result.rows.length) {
      return res.status(400).json({ error: "User not found" });
    }

    const user = result.rows[0];

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(400).json({ error: "Invalid password" });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: formatDisplayName(user.email),
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Login failed" });
  }
};

// Returns the authenticated user's profile.
exports.me = async (req, res) => {
  try {
    const { userId } = req.user;
    const result = await pool.query("SELECT id, email FROM users WHERE id=$1", [
      userId,
    ]);

    if (!result.rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = result.rows[0];
    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: formatDisplayName(user.email),
      },
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return res.status(500).json({ error: "Failed to fetch user profile" });
  }
};

// Creates a password reset token and returns a reset URL in non-production.
exports.forgotPassword = async (req, res) => {
  try {
    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const userResult = await pool.query(
      "SELECT id, email FROM users WHERE lower(email)=lower($1)",
      [email],
    );

    let resetUrl = null;

    if (userResult.rows.length) {
      const user = userResult.rows[0];
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = hashResetToken(rawToken);
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

      await pool.query("DELETE FROM password_resets WHERE expires_at < NOW()");

      await pool.query(
        `
        INSERT INTO password_resets(user_id, token_hash, expires_at)
        VALUES ($1, $2, $3)
        `,
        [user.id, tokenHash, expiresAt],
      );

      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

      console.log(`Password reset link for ${user.email}: ${resetUrl}`);
    }

    return res.json({
      message:
        "If that email exists, a password reset link has been generated.",
      ...(process.env.NODE_ENV !== "production" && resetUrl
        ? { resetUrl }
        : {}),
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({ error: "Failed to process password reset request" });
  }
};

// Validates a reset token and updates the user's password.
exports.resetPassword = async (req, res) => {
  try {
    const token = String(req.body?.token || "").trim();
    const password = String(req.body?.password || "");

    if (!token || !password) {
      return res.status(400).json({ error: "Token and new password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const tokenHash = hashResetToken(token);
    const resetResult = await pool.query(
      `
      SELECT id, user_id
      FROM password_resets
      WHERE token_hash=$1
        AND used_at IS NULL
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [tokenHash],
    );

    if (!resetResult.rows.length) {
      return res.status(400).json({ error: "Reset link is invalid or expired" });
    }

    const resetRow = resetResult.rows[0];
    const passwordHash = await bcrypt.hash(password, 10);

    await pool.query("BEGIN");
    await pool.query("UPDATE users SET password=$1 WHERE id=$2", [
      passwordHash,
      resetRow.user_id,
    ]);
    await pool.query("UPDATE password_resets SET used_at=NOW() WHERE id=$1", [
      resetRow.id,
    ]);
    await pool.query(
      `
      DELETE FROM password_resets
      WHERE user_id=$1
        AND id<>$2
        AND used_at IS NULL
      `,
      [resetRow.user_id, resetRow.id],
    );
    await pool.query("COMMIT");

    return res.json({ message: "Password reset successful. Please login again." });
  } catch (error) {
    try {
      await pool.query("ROLLBACK");
    } catch (_) {
      // no-op
    }
    console.error("Reset password error:", error);
    return res.status(500).json({ error: "Failed to reset password" });
  }
};
