import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = "/api";

export default function RegisterLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("customer");
  const navigate = useNavigate();

  async function submit(endpoint) {
    const payload = endpoint === "register" ? { email, password, role } : { email, password };

    try {
      const res = await fetch(`${API_URL}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      console.log(data); 

      if (!res.ok) {
        alert(data.message || "Error");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);
      navigate(`/${data.role}`);
    } catch (error) {
      console.error("Network error:", error);
      alert("Network error. Please try again.");
    }
  }

  return (
    <div style={{
      maxWidth: 400, margin: "50px auto", padding: 30, fontSize: 18,
      borderRadius: 10, backgroundColor: "#e0f7fa", boxShadow: "0 0 10px rgba(0,0,0,0.2)"
    }}>
      <h2 style={{ textAlign: "center", marginBottom: 20 }}>{role === "provider" ? "Provider" : "Customer"} Login/Register</h2>
      <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
        style={{ width: "100%", margin: "10px 0", fontSize: 16, padding: 10, borderRadius: 5, border: "1px solid #ccc" }} />
      <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
        style={{ width: "100%", margin: "10px 0", fontSize: 16, padding: 10, borderRadius: 5, border: "1px solid #ccc" }} />
      <select value={role} onChange={e => setRole(e.target.value)}
        style={{ width: "100%", margin: "10px 0", fontSize: 16, padding: 10, borderRadius: 5, border: "1px solid #ccc" }}>
        <option value="customer">Customer</option>
        <option value="provider">Provider</option>
      </select>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
        <button onClick={() => submit("register")} style={{ width: "48%", fontSize: 16, padding: 10, borderRadius: 5, cursor: "pointer", backgroundColor: "#00796b", color: "#fff", border: "none" }}>Register</button>
        <button onClick={() => submit("login")} style={{ width: "48%", fontSize: 16, padding: 10, borderRadius: 5, cursor: "pointer", backgroundColor: "#004d40", color: "#fff", border: "none" }}>Login</button>
      </div>
    </div>
  );
}

