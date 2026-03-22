import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/api";
import styles from "../styles/AuthPages.module.css";

// Starts the password reset flow and shows the generated reset URL in dev.
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resetUrl, setResetUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setResetUrl("");
    setLoading(true);
    try {
      const res = await api.post("/auth/forgot-password", { email });
      setSuccess(res.data?.message || "Reset link generated.");
      if (res.data?.resetUrl) {
        setResetUrl(res.data.resetUrl);
      }
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          "Could not process request. Please try again.",
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

        <h1 className={styles.title}>Forgot password</h1>
        <p className={styles.subtitle}>
          Enter your registered email and we will generate a reset link.
        </p>

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
            {resetUrl ? (
              <a
                href={resetUrl}
                style={{
                  color: "#14532d",
                  fontWeight: 800,
                  fontSize: "1.02rem",
                  textDecoration: "underline",
                }}
              >
                Open reset link
              </a>
            ) : (
              success
            )}
          </div>
        )}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label}>Work Email</label>
            <input
              className={styles.input}
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <button className={styles.submitBtn} type="submit" disabled={loading}>
            {loading ? "Sending link..." : "Send Reset Link ->"}
          </button>
        </form>

        <p className={styles.switchText} style={{ marginTop: "20px" }}>
          Remembered password?{" "}
          <Link to="/login" className={styles.switchLink}>
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
