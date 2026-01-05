import React, { useState, useEffect, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

// On utilise l'URL absolue de ton backend Render pour être sûr à 100%
const API_URL = "https://abs-project.onrender.com/api";

export default function ProviderDashboard() {
  const [services, setServices] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [form, setForm] = useState({ title: "", description: "", price: "" });
  const [editingId, setEditingId] = useState(null);
  const [workingHours, setWorkingHours] = useState([]);
  const [newHour, setNewHour] = useState({ day: "", start: "", end: "" });

  const getToken = () => localStorage.getItem("token");

  /* ================= RÉCUPÉRATION DES DONNÉES ================= */
  const fetchServices = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/services`, {
        headers: { Authorization: "Bearer " + getToken() },
      });
      const data = await res.json();
      setServices(Array.isArray(data) ? data : []);
    } catch (e) { console.error("Services fetch error", e); }
  }, []);

  const fetchAppointments = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/appointments`, {
        headers: { Authorization: "Bearer " + getToken() },
      });
      const data = await res.json();
      setAppointments(Array.isArray(data) ? data : []);
    } catch (e) { console.error("Appointments fetch error", e); }
  }, []);

  const fetchWorkingHours = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/working-hours`, {
        headers: { Authorization: "Bearer " + getToken() },
      });
      const data = await res.json();
      setWorkingHours(data.hours || []);
    } catch (e) { console.error("Working hours fetch error", e); }
  }, []);

  useEffect(() => {
    fetchServices();
    fetchAppointments();
    fetchWorkingHours();
  }, [fetchServices, fetchAppointments, fetchWorkingHours]);

  /* ================= GESTION DES SERVICES (CRUD) ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.price) return alert("Le titre et le prix sont requis");

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
        alert("Erreur serveur: " + (errorData.message || res.statusText));
        return;
      }

      setForm({ title: "", description: "", price: "" });
      setEditingId(null);
      fetchServices();
    } catch (err) {
      console.error("Submit error:", err);
      alert("Erreur réseau: Impossible de contacter le serveur à l'adresse " + API_URL);
    }
  };

  const handleEdit = (service) => {
    setForm({ title: service.title, description: service.description, price: service.price });
    setEditingId(service.id);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer ce service ?")) return;
    try {
      await fetch(`${API_URL}/services/${id}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + getToken() },
      });
      fetchServices();
    } catch (err) { alert("Erreur lors de la suppression"); }
  };

  /* ================= HEURES DE TRAVAIL ================= */
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
    } catch (err) { console.error("Save error", err); }
  };

  /* ================= PRÉPARATION CALENDRIER ================= */
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

      {/* FORMULAIRE SERVICES */}
      <section style={{ marginBottom: "40px", padding: "20px", background: "#f9f9f9", borderRadius: "8px" }}>
        <h2>{editingId === null ? "Créer un Service" : "Modifier le Service"}</h2>
        <form onSubmit={handleSubmit}>
          <input type="text" placeholder="Titre" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} style={{ width: "100%", padding: "10px", marginBottom: "10px" }} />
          <input type="text" placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ width: "100%", padding: "10px", marginBottom: "10px" }} />
          <input type="number" placeholder="Prix" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} style={{ width: "100%", padding: "10px", marginBottom: "10px" }} />
          <button type="submit" style={{ padding: "10px 20px", backgroundColor: "#3498db", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer" }}>
            {editingId === null ? "Créer" : "Mettre à jour"}
          </button>
        </form>
      </section>

      {/* LISTE SERVICES */}
      <section style={{ marginBottom: "40px" }}>
        {services.map(s => (
          <div key={s.id} style={{ border: "1px solid #ccc", padding: "15px", marginBottom: "10px", borderRadius: "5px", backgroundColor: "#ecf0f1" }}>
            <strong>{s.title}</strong> - {s.price} FCFA
            <div style={{ marginTop: "10px" }}>
              <button onClick={() => handleEdit(s)} style={{ marginRight: "10px" }}>Modifier</button>
              <button onClick={() => handleDelete(s.id)} style={{ color: "red" }}>Supprimer</button>
            </div>
          </div>
        ))}
      </section>

      {/* GESTION WORKING HOURS */}
      <section style={{ marginBottom: "40px" }}>
        <h2>Horaires de travail</h2>
        <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
          <select value={newHour.day} onChange={e => setNewHour({ ...newHour, day: e.target.value })} style={{ padding: "8px" }}>
            <option value="">Jour</option>
            {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <input type="time" value={newHour.start} onChange={e => setNewHour({ ...newHour, start: e.target.value })} style={{ padding: "8px" }} />
          <input type="time" value={newHour.end} onChange={e => setNewHour({ ...newHour, end: e.target.value })} style={{ padding: "8px" }} />
          <button type="button" onClick={async () => {
            if (!newHour.day || !newHour.start || !newHour.end) return alert("Remplissez tous les champs");
            const updated = [...workingHours, newHour];
            setWorkingHours(updated);
            setNewHour({ day: "", start: "", end: "" });
            await persistWorkingHours(updated);
          }} style={{ padding: "8px 12px", backgroundColor: "#27ae60", color: "#fff", border: "none", borderRadius: "5px" }}>Ajouter</button>
        </div>
        <ul>
          {workingHours.map((h, i) => (
            <li key={i}>
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
