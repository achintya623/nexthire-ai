import { useState } from "react";
import api from "./api";
import { Zap } from "lucide-react";

export default function RegisterPage({ setPage }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const register = async () => {
    try {
      await api.post("/auth/register", { name, email, password });

      alert("Account created. You can now login.");
      setPage("login");
    } catch {
      alert("Registration failed");
    }
  };

  return (
    <div className="page-wrapper auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <Zap size={28} />
          <h2>NextHire AI</h2>
          <p>Create your recruiter account</p>
        </div>

        <div className="auth-form">
          <input
            className="form-input"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

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
            onClick={register}
          >
            Create Account
          </button>

          <div className="auth-switch">
            Already have an account?
            <button onClick={() => setPage("login")}>Login</button>
          </div>
        </div>
      </div>
    </div>
  );
}
