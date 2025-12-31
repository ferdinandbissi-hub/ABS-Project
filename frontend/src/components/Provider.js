import { useEffect, useState } from "react";

export default function Provider() {
  const [appointments, setAppointments] = useState([]);
  const token = localStorage.getItem("token");

  async function addSlot() {
    await fetch("http://localhost:5000/slots", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify({ time: new Date().toISOString() }),
    });
  }

  useEffect(() => {
    fetch("http://localhost:5000/appointments", {
      headers: { Authorization: token },
    })
      .then(res => res.json())
      .then(setAppointments);
  }, []);

  return (
    <div>
      <h2>Provider Dashboard</h2>
      <button onClick={addSlot}>Add Slot</button>
      <ul>
        {appointments.map((a, i) => (
          <li key={i}>{a.slot.time} - {a.customer}</li>
        ))}
      </ul>
    </div>
  );
}

