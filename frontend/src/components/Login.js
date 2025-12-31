import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  // ===== STATE =====
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("customer");

  const navigate = useNavigate();

  // ===== SUBMIT FUNCTION (ICI) =====
  async function submit(endpoint) {
    const payload =
      endpoint === "register"
        ? { email, password, role }
        : { email, password };

    const res = await fetch(`http://localhost:5000/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message);
      return;
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("role", data.role);
    navigate(`/${data.role}`);
  }

  // ===== RENDER =====
  return (
    <div className="container">
      <h2>Login / Register</h2>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
      />

      <select value={role} onChange={e => setRole(e.target.value)}>
        <option value="customer">Customer</option>
        <option value="provider">Provider</option>
      </select>

      <button onClick={() => submit("register")}>Register</button>
      <button onClick={() => submit("login")}>Login</button>
    </div>
  );
}

