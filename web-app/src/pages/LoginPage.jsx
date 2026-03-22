import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/api";
import styles from "../styles/AuthPages.module.css";

// Handles recruiter login, session persistence, and post-login navigation.
export default function LoginPage({ setUser, showAlert }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", res.data.token);

      let userPayload = res.data?.user || null;
      if (!userPayload) {
        const me = await api.get("/auth/me");
        userPayload = me.data?.user || null;
      }

      if (!userPayload) {
        userPayload = { email, name: email.split("@")[0] || "Recruiter" };
      }

      localStorage.setItem("nh_user", JSON.stringify(userPayload));
      if (setUser) {
        setUser({ loggedIn: true, ...userPayload });
      }
      if (showAlert) {
        showAlert({
          type: "success",
          title: "Login successful",
          message: `Welcome back, ${userPayload.name || "Recruiter"}!`,
        });
      }
      navigate("/app");
    } catch (err) {
      setError(err?.response?.data?.error || "Invalid credentials. Please try again.");
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

        <h1 className={styles.title}>Welcome back</h1>
        <p className={styles.subtitle}>Sign in to your recruiter account</p>

        {error && <div className={styles.error}>{error}</div>}

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
          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <input
              className={styles.input}
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Link to="/forgot-password" className={styles.forgotLink}>
              Forgot password?
            </Link>
          </div>
          <button className={styles.submitBtn} type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In ->"}
          </button>
        </form>

        <p className={styles.switchText} style={{ marginTop: "20px" }}>
          Don't have an account?{" "}
          <Link to="/register" className={styles.switchLink}>
            Create one free
          </Link>
        </p>
      </div>
    </div>
  );
}
