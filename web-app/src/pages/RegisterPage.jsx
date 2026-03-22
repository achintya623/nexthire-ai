import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/api";
import styles from "../styles/AuthPages.module.css";

// Handles new user registration and redirects to login on success.
export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [form, setForm] = useState({
    name: "",
    email: searchParams.get("email") || "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/register", {
        name: form.name,
        email: form.email,
        password: form.password,
      });
      navigate("/login");
    } catch (err) {
      setError(err?.response?.data?.error || "Could not create account. Please try again.");
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

        <h1 className={styles.title}>Create your account</h1>
        <p className={styles.subtitle}>Start screening smarter - free forever</p>

        {error && <div className={styles.error}>{error}</div>}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label}>Full Name</label>
            <input
              className={styles.input}
              type="text"
              placeholder="Priya Sharma"
              value={form.name}
              onChange={set("name")}
              required
              autoFocus
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Work Email</label>
            <input
              className={styles.input}
              type="email"
              placeholder="you@company.com"
              value={form.email}
              onChange={set("email")}
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <input
              className={styles.input}
              type="password"
              placeholder="Min. 6 characters"
              value={form.password}
              onChange={set("password")}
              required
            />
          </div>
          <button className={styles.submitBtn} type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Create Account ->"}
          </button>
        </form>

        <p className={styles.switchText} style={{ marginTop: "20px" }}>
          Already have an account?{" "}
          <Link to="/login" className={styles.switchLink}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
