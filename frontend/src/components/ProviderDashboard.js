import React, { useState, useEffect, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

const API_URL = "/api";

export default function ProviderDashboard() {
  const [services, setServices] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [form, setForm] = useState({ title: "", description: "", price: "" });
  const [editingId, setEditingId] = useState(null);
  const [workingHours, setWorkingHours] = useState([]);
  const [newHour, setNewHour] = useState({ day: "", start: "", end: "" });

  const getToken = () => localStorage.getItem("token");

  /* ================= FETCH DATA ================= */
  const fetchServices = useCallback(async () => {
    const res = await fetch(`${API_URL}/services`, {
      headers: { Authorization: "Bearer " + getToken() },
    });
    const data = await res.json();
    setServices(Array.isArray(data) ? data : []);
  }, []);

  const fetchAppointments = useCallback(async () => {
    const res = await fetch(`${API_URL}/appointments`, {
      headers: { Authorization: "Bearer " + getToken() },
    });
    const data = await res.json();
    setAppointments(Array.isArray(data) ? data : []);
  }, []);

  const fetchWorkingHours = useCallback(async () => {
    const res = await fetch(`${API_URL}/working-hours`, {
      headers: { Authorization: "Bearer " + getToken() },
    });
    const data = await res.json();
    setWorkingHours(data.hours || []);
  }, []);

  useEffect(() => {
    fetchServices();
    fetchAppointments();
    fetchWorkingHours();
  }, [fetchServices, fetchAppointments, fetchWorkingHours]);

  /* ================= SERVICES CRUD ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.price) return alert("Title and price are required");

    const url = editingId === null ? `${API_URL}/services` : `${API_URL}/services/${editingId}`;
    const method = editingId === null ? "POST" : "PUT";

    try {
      const res = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + getToken(),
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const errorData = await res.json();
        alert(errorData.message || "Error saving service");
        return;
      }

      setForm({ title: "", description: "", price: "" });
      setEditingId(null);
      fetchServices();
    } catch (err) {
      alert("Network error. Please try again.");
    }
  };

  const handleEdit = (service) => {
    setForm({ title: service.title, description: service.description, price: service.price });
    setEditingId(service.id);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this service?")) return;
    await fetch(`${API_URL}/services/${id}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer " + getToken() },
    });
    fetchServices();
  };

  /* ================= WORKING HOURS ================= */
  const persistWorkingHours = async (hours) => {
    await fetch(`${API_URL}/working-hours`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + getToken(),
      },
      body: JSON.stringify({ hours }),
    });
  };

  /* ================= CALENDAR PREP ================= */
  const workingEvents = workingHours.map((h) => {
    const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const start = new Date();
    start.setDate(start.getDate() - start.getDay() + dayMap[h.day]);
    const [sh, sm] = h.start.split(":").map(Number);
    start.setHours(sh, sm, 0, 0);
    const end = new Date(start);
    const [eh, em] = h.end.split(":").map(Number);
    end.setHours(eh, em, 0, 0);
    return { start, end, display: "background", backgroundColor: "#27ae60" };
  });

  const calendarEvents = appointments.filter(a => a.status === "booked").map(a => ({
    id: a.id,
    title: `Service: ${a.serviceTitle}(${a.price} FCFA)`,
    start: a.slot,
    backgroundColor: "#3498db"
  }));

  return (
    <div style={{ maxWidth: "900px", margin: "20px auto", padding: "20px", fontFamily: "Arial" }}>
      <h1 style={{ textAlign: "center", color: "#2c3e50" }}>Provider Dashboard</h1>

      {/* CREATE/EDIT SERVICE */}
      <section style={{ marginBottom: "40px" }}>
        <h2 style={{ color: "#34495e" }}>{editingId === null ? "Create Service" : "Edit Service"}</h2>
        <form onSubmit={handleSubmit} style={{ marginBottom: "20px" }}>
          <input type="text" placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} style={{ width: "100%", padding: "10px", marginBottom: "10px", borderRadius: "5px" }} />
          <input type="text" placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ width: "100%", padding: "10px", marginBottom: "10px", borderRadius: "5px" }} />
          <input type="number" placeholder="Price" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} style={{ width: "100%", padding: "10px", marginBottom: "10px", borderRadius: "5px" }} />
          <button type="submit" style={{ padding: "10px 20px", backgroundColor: "#3498db", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer" }}>
            {editingId === null ? "Create Service" : "Update Service"}
          </button>
        </form>
      </section>

      {/* SERVICES LIST */}
      <section style={{ marginBottom: "40px" }}>
        <h2 style={{ color: "#34495e" }}>Services</h2>
        {services.map(s => (
          <div key={s.id} style={{ border: "1px solid #ccc", padding: "15px", marginBottom: "10px", borderRadius: "5px", backgroundColor: "#ecf0f1" }}>
            <h3 style={{ margin: "0 0 5px 0" }}>{s.title}</h3>
            <p style={{ margin: 0, fontWeight: "bold" }}>{s.price} FCFA</p>
            <div style={{ marginTop: "10px" }}>
              <button onClick={() => handleEdit(s)} style={{ marginRight: "10px" }}>Edit</button>
              <button onClick={() => handleDelete(s.id)} style={{ color: "red" }}>Delete</button>
            </div>
          </div>
        ))}
      </section>

      {/* WORKING HOURS SECTION (RESTAURÉ) */}
      <section style={{ marginBottom: "40px" }}>
        <h2 style={{ color: "#34495e" }}>Set Working Hours</h2>
        <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
          <select value={newHour.day} onChange={e => setNewHour({ ...newHour, day: e.target.value })} style={{ padding: "8px" }}>
            <option value="">Select Day</option>
            {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <input type="time" value={newHour.start} onChange={e => setNewHour({ ...newHour, start: e.target.value })} style={{ padding: "8px" }} />
          <input type="time" value={newHour.end} onChange={e => setNewHour({ ...newHour, end: e.target.value })} style={{ padding: "8px" }} />
          <button type="button" onClick={async () => {
            if (!newHour.day || !newHour.start || !newHour.end) return alert("Fill all fields");
            const updated = [...workingHours, newHour];
            setWorkingHours(updated);
            setNewHour({ day: "", start: "", end: "" });
            await persistWorkingHours(updated);
          }} style={{ padding: "8px 12px", backgroundColor: "#27ae60", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer" }}>Add</button>
        </div>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {workingHours.map((h, i) => (
            <li key={i} style={{ padding: "5px", borderBottom: "1px solid #eee" }}>
              {h.day}: {h.start} - {h.end}
              <button onClick={async () => {
                const updated = workingHours.filter((_, idx) => idx !== i);
                setWorkingHours(updated);
                await persistWorkingHours(updated);
              }} style={{ marginLeft: "10px", color: "red", border: "none", background: "none", cursor: "pointer" }}>X</button>
            </li>
          ))}
        </ul>
      </section>

      {/* CALENDRIER 6AM - 10PM */}
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        events={[...calendarEvents, ...workingEvents]}
        slotMinTime="06:00:00"
        slotMaxTime="22:00:00"
        height="auto"
        allDaySlot={false}
      />
    </div>
  );
}
