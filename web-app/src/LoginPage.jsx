import { useState } from "react";
import api from "./api";
import { Zap } from "lucide-react";

export default function LoginPage({ setUser, setPage }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = async () => {
    console.log("Login clicked");

    try {
      const res = await api.post("/auth/login", {
        email,
        password,
      });

      console.log("LOGIN RESPONSE:", res.data);

      localStorage.setItem("token", res.data.token);

      // FIX
      setUser({ loggedIn: true });
    } catch (err) {
      console.error("LOGIN ERROR:", err);
      alert("Login failed");
    }
  };

  return (
    <div className="page-wrapper auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <Zap size={28} />
          <h2>NextHire AI</h2>
          <p>Sign in to your recruiter dashboard</p>
        </div>

        <div className="auth-form">
          <input
            className="form-input"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            className="form-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            className="app-button app-button-primary auth-button"
            onClick={login}
          >
            Login
          </button>

          <div className="auth-switch">
            No account?
            <button onClick={() => setPage("register")}>Create one</button>
          </div>
        </div>
      </div>
    </div>
  );
}
