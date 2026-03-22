import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/api";
import styles from "../styles/AuthPages.module.css";

// Completes password reset using a token from the reset link.
export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!token) {
      setError("Reset token is missing.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/reset-password", {
        token,
        password,
      });
      setSuccess(
        res.data?.message || "Password reset successful. Redirecting to login...",
      );
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          "Failed to reset password. Please request a new link.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.bgGlow} />
      <div className={styles.bgGrid} />

      <div className={styles.card}>
        <Link to="/" className={styles.logoArea}>
          <div className={styles.logoMark}>N</div>
          <span className={styles.logoText}>
            NextHire<span>AI</span>
          </span>
        </Link>

        <h1 className={styles.title}>Reset password</h1>
        <p className={styles.subtitle}>Set your new account password.</p>

        {error && <div className={styles.error}>{error}</div>}
        {success && (
          <div
            className={styles.error}
            style={{
              background: "#ecfdf5",
              borderColor: "#86efac",
              color: "#166534",
            }}
          >
            {success}
          </div>
        )}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label}>New Password</label>
            <input
              className={styles.input}
              type="password"
              placeholder="Min. 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Confirm Password</label>
            <input
              className={styles.input}
              type="password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button className={styles.submitBtn} type="submit" disabled={loading}>
            {loading ? "Updating..." : "Update Password ->"}
          </button>
        </form>

        <p className={styles.switchText} style={{ marginTop: "20px" }}>
          Back to{" "}
          <Link to="/login" className={styles.switchLink}>
            login
          </Link>
        </p>
      </div>
    </div>
  );
}
