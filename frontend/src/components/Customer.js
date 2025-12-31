import { useEffect, useState } from "react";

export default function Customer() {
  const [slots, setSlots] = useState([]);
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetch("http://localhost:5000/slots", {
      headers: { Authorization: token },
    })
      .then(res => res.json())
      .then(setSlots);
  }, []);

  async function book(id) {
    await fetch(`http://localhost:5000/book/${id}`, {
      method: "POST",
      headers: { Authorization: token },
    });
    setSlots(slots.filter(s => s.id !== id));
  }

  return (
    <div>
      <h2>Available Slots</h2>
      <ul>
        {slots.map(s => (
          <li key={s.id}>
            {s.time} <button onClick={() => book(s.id)}>Book</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

