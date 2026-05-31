import { useState } from "react";
import axios from "axios";
import "../App.css";

const AuthPage = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    // Validation
    if (!email || !password) {
      setError("Please fill all fields.");
      return;
    }
    if (!isLogin && !name) {
      setError("Please enter your name.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const url = isLogin
        ? "https://speech-to-text-project-j95m.onrender.com/auth/login"
        : "https://speech-to-text-project-j95m.onrender.com/auth/register";

      const payload = isLogin
        ? { email, password }
        : { name, email, password };

      const response = await axios.post(url, payload);

      // Token aur user save karo
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));

      onLogin(response.data.user); // Parent ko batao login ho gaya

    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="wrapper" style={{ maxWidth: "420px" }}>

        {/* Header */}
        <div className="header">
          <div className="header-icon">🎙️</div>
          <h1>Speech to Text</h1>
          <p>{isLogin ? "Login to your account" : "Create a new account"}</p>
        </div>

        {/* Auth Card */}
        <div className="card">
          <h2 style={{
            fontSize: "22px",
            fontWeight: "900",
            color: "#1e1b4b",
            marginBottom: "24px",
            textAlign: "center"
          }}>
            {isLogin ? "Welcome Back 👋" : "Get Started 🚀"}
          </h2>

          {/* Name — only register */}
          {!isLogin && (
            <div style={{ marginBottom: "16px" }}>
              <label className="section-label">Full Name</label>
              <input
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={inputStyle}
              />
            </div>
          )}

          {/* Email */}
          <div style={{ marginBottom: "16px" }}>
            <label className="section-label">Email Address</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: "24px" }}>
            <label className="section-label">Password</label>
            <input
              type="password"
              placeholder="Min 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="error-box" style={{ marginBottom: "16px" }}>
              <span>⚠️</span> {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn btn-indigo"
            style={{ marginTop: "0" }}
          >
            {loading ? (
              <><div className="spinner"></div> Please wait...</>
            ) : isLogin ? "🔐 Login" : "🚀 Create Account"}
          </button>

          {/* Toggle */}
          <p style={{
            textAlign: "center",
            marginTop: "20px",
            fontSize: "14px",
            color: "#6b7280"
          }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => { setIsLogin(!isLogin); setError(""); }}
              style={{
                background: "none",
                border: "none",
                color: "#4f46e5",
                fontWeight: "700",
                cursor: "pointer",
                fontSize: "14px"
              }}
            >
              {isLogin ? "Register" : "Login"}
            </button>
          </p>
        </div>

        <p className="footer">Built with ❤️ using React + Node.js + AssemblyAI</p>
      </div>
    </div>
  );
};

// Input style
const inputStyle = {
  width: "100%",
  padding: "14px 16px",
  border: "2px solid #e0e7ff",
  borderRadius: "12px",
  fontSize: "15px",
  color: "#1f2937",
  outline: "none",
  transition: "border 0.2s",
  boxSizing: "border-box",
};

export default AuthPage;