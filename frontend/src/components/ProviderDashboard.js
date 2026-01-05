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

  const fetchServices = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/services`, {
        headers: { Authorization: "Bearer " + getToken() },
      });
      const data = await res.json();
      setServices(Array.isArray(data) ? data : []);
    } catch (e) { console.error("Error fetching services:", e); }
  }, []);

  const fetchAppointments = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/appointments`, {
        headers: { Authorization: "Bearer " + getToken() },
      });
      const data = await res.json();
      setAppointments(Array.isArray(data) ? data : []);
    } catch (e) { console.error("Error fetching appointments:", e); }
  }, []);

  useEffect(() => {
    fetchServices();
    fetchAppointments();
  }, [fetchServices, fetchAppointments]);

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

      const data = await res.json();

      if (!res.ok) {
        alert("Server says: " + (data.message || "Unknown error"));
        return;
      }

      setForm({ title: "", description: "", price: "" });
      setEditingId(null);
      fetchServices();
    } catch (error) {
      // Si on arrive ici, c'est que le serveur n'a même pas répondu (URL erronée ou crash)
      console.error("Submission error:", error);
      alert("Network error: Cannot reach the server. Check if the URL /api/services exists.");
    }
  };

  const handleEdit = (service) => {
    setForm({ title: service.title, description: service.description, price: service.price });
    setEditingId(service.id);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this service?")) return;
    try {
      const res = await fetch(`${API_URL}/services/${id}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + getToken() },
      });
      if (res.ok) fetchServices();
    } catch (e) { alert("Network error during delete"); }
  };

  /* ================= WORKING HOURS ================= */
  const fetchWorkingHours = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/working-hours`, {
        headers: { Authorization: "Bearer " + getToken() },
      });
      const data = await res.json();
      setWorkingHours(data.hours || []);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    fetchWorkingHours();
  }, [fetchWorkingHours]);

  const persistWorkingHours = async (hours) => {
    try {
      await fetch(`${API_URL}/working-hours`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + getToken(),
        },
        body: JSON.stringify({ hours }),
      });
    } catch (e) { console.error(e); }
  };

  /* ================= CALENDAR SETTINGS ================= */
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
    title: `${a.serviceTitle} (${a.price} FCFA)`,
    start: a.slot,
    backgroundColor: "#3498db"
  }));

  return (
    <div style={{ maxWidth: "900px", margin: "20px auto", padding: "20px", fontFamily: "Arial" }}>
      <h1 style={{ textAlign: "center", color: "#2c3e50" }}>Provider Dashboard</h1>

      {/* Formulaire Service (Original Style) */}
      <section style={{ marginBottom: "40px", padding: "20px", background: "#f9f9f9", borderRadius: "8px" }}>
        <h2>{editingId === null ? "Create Service" : "Edit Service"}</h2>
        <form onSubmit={handleSubmit}>
          <input type="text" placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} style={{ width: "100%", padding: "10px", marginBottom: "10px" }} />
          <input type="text" placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ width: "100%", padding: "10px", marginBottom: "10px" }} />
          <input type="number" placeholder="Price" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} style={{ width: "100%", padding: "10px", marginBottom: "10px" }} />
          <button type="submit" style={{ padding: "10px 20px", backgroundColor: "#3498db", color: "#fff", border: "none", cursor: "pointer", borderRadius: "5px" }}>
            {editingId === null ? "Create Service" : "Update Service"}
          </button>
          {editingId && <button type="button" onClick={() => {setEditingId(null); setForm({title:"", description:"", price:""})}} style={{marginLeft: "10px"}}>Cancel</button>}
        </form>
      </section>

      {/* Liste des Services */}
      <section style={{ marginBottom: "40px" }}>
        {services.map(s => (
          <div key={s.id} style={{ border: "1px solid #ccc", padding: "15px", marginBottom: "10px", borderRadius: "5px", backgroundColor: "#ecf0f1" }}>
            <strong>{s.title}</strong> - {s.price} FCFA
            <div style={{marginTop: "5px"}}>
              <button onClick={() => handleEdit(s)} style={{marginRight: "5px"}}>Edit</button>
              <button onClick={() => handleDelete(s.id)} style={{color: "red"}}>Delete</button>
            </div>
          </div>
        ))}
      </section>

      {/* Calendrier 6am - 10pm */}
      <h2 style={{ color: "#34495e" }}>Schedule</h2>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        events={[...calendarEvents, ...workingEvents]}
        slotMinTime="06:00:00" 
        slotMaxTime="22:00:00" 
        height="auto"
        allDaySlot={false}
        nowIndicator={true}
      />
    </div>
  );
}
