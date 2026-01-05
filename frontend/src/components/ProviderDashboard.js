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
    try {
      const res = await fetch(`${API_URL}/services`, {
        headers: { Authorization: "Bearer " + getToken() },
      });
      const data = await res.json();
      setServices(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
  }, []);

  const fetchAppointments = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/appointments`, {
        headers: { Authorization: "Bearer " + getToken() },
      });
      const data = await res.json();
      setAppointments(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
  }, []);

  const fetchWorkingHours = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/working-hours`, {
        headers: { Authorization: "Bearer " + getToken() },
      });
      const data = await res.json();
      setWorkingHours(data.hours || []);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => {
    fetchServices();
    fetchAppointments();
    fetchWorkingHours();
  }, [fetchServices, fetchAppointments, fetchWorkingHours]);

  /* ================= CRUD SERVICES ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = editingId ? `${API_URL}/services/${editingId}` : `${API_URL}/services`;
    try {
      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + getToken() },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setForm({ title: "", description: "", price: "" });
        setEditingId(null);
        fetchServices();
      }
    } catch (err) { alert("Network error"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete?")) return;
    await fetch(`${API_URL}/services/${id}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer " + getToken() },
    });
    fetchServices();
  };

  /* ================= WORKING HOURS ================= */
  const persistWorkingHours = async (hours) => {
    try {
      await fetch(`${API_URL}/working-hours`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + getToken() },
        body: JSON.stringify({ hours }),
      });
    } catch (err) { console.error(err); }
  };

  const addWorkingHour = async () => {
    if (!newHour.day || !newHour.start || !newHour.end) return alert("Fill all fields");
    const updated = [...workingHours, newHour];
    setWorkingHours(updated);
    setNewHour({ day: "", start: "", end: "" });
    await persistWorkingHours(updated);
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
    id: a.id, title: a.serviceTitle, start: a.slot, backgroundColor: "#3498db"
  }));

  return (
    <div style={{ maxWidth: "900px", margin: "20px auto", padding: "20px", fontFamily: "sans-serif" }}>
      <h1>Provider Dashboard</h1>

      {/* Services Section */}
      <section style={{ background: "#f4f4f4", padding: "15px", borderRadius: "8px", marginBottom: "20px" }}>
        <h2>{editingId ? "Edit Service" : "Add Service"}</h2>
        <form onSubmit={handleSubmit}>
          <input placeholder="Title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} style={{marginRight:"10px"}} />
          <input placeholder="Price" type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} style={{marginRight:"10px"}} />
          <button type="submit" style={{background: "#3498db", color: "white", border: "none", padding: "5px 10px"}}>{editingId ? "Update" : "Create"}</button>
        </form>
        <div style={{ marginTop: "15px" }}>
          {services.map(s => (
            <div key={s.id} style={{ borderBottom: "1px solid #ccc", padding: "5px 0" }}>
              {s.title} - {s.price} FCFA 
              <button onClick={() => {setEditingId(s.id); setForm(s)}} style={{marginLeft: "10px"}}>Edit</button>
              <button onClick={() => handleDelete(s.id)} style={{marginLeft: "5px", color: "red"}}>X</button>
            </div>
          ))}
        </div>
      </section>

      {/* Working Hours Section */}
      <section style={{ background: "#e8f5e9", padding: "15px", borderRadius: "8px", marginBottom: "20px" }}>
        <h2>Working Hours</h2>
        <select value={newHour.day} onChange={e => setNewHour({...newHour, day: e.target.value})}>
          <option value="">Day</option>
          {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <input type="time" value={newHour.start} onChange={e => setNewHour({...newHour, start: e.target.value})} />
        <input type="time" value={newHour.end} onChange={e => setNewHour({...newHour, end: e.target.value})} />
        <button onClick={addWorkingHour}>Add Hour</button>
        <ul>
          {workingHours.map((h, i) => <li key={i}>{h.day}: {h.start} - {h.end}</li>)}
        </ul>
      </section>

      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        events={[...calendarEvents, ...workingEvents]}
        height="auto"
      />
    </div>
  );
}
