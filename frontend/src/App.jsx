import { useState, useEffect } from "react";
import "./App.css";
import Recorder from "./components/Recorder";
import AuthPage from "./components/AuthPage";

function App() {
  const [user, setUser] = useState(null);

  // ✅ Page reload pe bhi login rahe
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  return user
    ? <Recorder user={user} onLogout={handleLogout} />
    : <AuthPage onLogin={handleLogin} />;
}

export default App;