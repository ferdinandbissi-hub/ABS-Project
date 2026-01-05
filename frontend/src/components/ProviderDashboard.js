import React, { useState, useEffect, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

//const DOLLAR_TO_FCFA = 650;

export default function ProviderDashboard() {
  const [services, setServices] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [form, setForm] = useState({ title: "", description: "", price: "" });
  const [editingId, setEditingId] = useState(null);
  const [workingHours, setWorkingHours] = useState([]);
  const [newHour, setNewHour] = useState({ day: "", start: "", end: "" });

  const getToken = () => localStorage.getItem("token");

  /* ================= FETCH SERVICES ================= */
  const fetchServices = useCallback(async () => {
    const res = await fetch("http://localhost:5000/services", {
      headers: { Authorization: "Bearer " + getToken() },
    });
    const data = await res.json();
    setServices(Array.isArray(data) ? data : []);
  }, []);

  /* ================= FETCH APPOINTMENTS ================= */
  const fetchAppointments = useCallback(async () => {
    const res = await fetch("http://localhost:5000/appointments", {
      headers: { Authorization: "Bearer " + getToken() },
    });
    const data = await res.json();
    setAppointments(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    fetchServices();
    fetchAppointments();
  }, [fetchServices, fetchAppointments]);

  /* ================= SERVICES CRUD ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.price) return alert("Title and price are required");

    const url =
      editingId === null
        ? "http://localhost:5000/services"
        : `http://localhost:5000/services/${editingId}`;

    await fetch(url, {
      method: editingId === null ? "POST" : "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + getToken(),
      },
      body: JSON.stringify(form),
    });

    setForm({ title: "", description: "", price: "" });
    setEditingId(null);
    fetchServices();
    fetchAppointments();
  };

  const handleEdit = (service) => {
    setForm(service);
    setEditingId(service.id);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this service?")) return;
    await fetch(`http://localhost:5000/services/${id}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer " + getToken() },
    });
    fetchServices();
    fetchAppointments();
  };

  /* ================= WORKING HOURS ================= */
  const fetchWorkingHours = useCallback(async () => {
    const res = await fetch("http://localhost:5000/working-hours", {
      headers: { Authorization: "Bearer " + getToken() },
    });
    const data = await res.json();
    setWorkingHours(data.hours || []);
  }, []);

  useEffect(() => {
    fetchWorkingHours();
  }, [fetchWorkingHours]);

  const persistWorkingHours = async (hours) => {
    await fetch("http://localhost:5000/working-hours", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + getToken(),
      },
      body: JSON.stringify({ hours }),
    });
  };

  /* ================= CALENDAR EVENTS ================= */
  const workingEvents = workingHours.map((h) => {
    const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const start = new Date();
    start.setDate(start.getDate() - start.getDay() + dayMap[h.day]);
    const [sh, sm] = h.start.split(":").map(Number);
    start.setHours(sh, sm, 0, 0);

    const end = new Date(start);
    const [eh, em] = h.end.split(":").map(Number);
    end.setHours(eh, em, 0, 0);

    return {
      start,
      end,
      display: "background",
      backgroundColor: "#27ae60",
      borderColor: "#1e8449",
    };
  });

const calendarEvents = appointments
  .filter((a) => a.status === "booked")
  .map((a) => {
    const day = new Date(a.slot).toLocaleDateString("en-US", { weekday: "short" });
    const slotTime = new Date(a.slot).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

    return {
      id: a.id,
      title: `Service: ${a.serviceTitle}(${a.price} FCFA)`, // court pour le calendrier
      start: a.slot,
      end: a.slot,
      backgroundColor: "#3498db",
      borderColor: "#2980b9",
      display: "block",
      extendedProps: {
        tooltip: `Day: ${day}\nTime: ${slotTime}\nService: ${a.serviceTitle}\nCustomer: ${a.customerEmail}`
      }
    };
  });



  const handleEventClick = async (info) => {
    if (!window.confirm("Cancel this appointment?")) return;
    await fetch(`http://localhost:5000/appointments/${info.event.id}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer " + getToken() },
    });
    fetchAppointments();
  };

  /* ================= RENDER ================= */
  return (
    <div style={{ maxWidth: "900px", margin: "20px auto", padding: "20px", fontFamily: "Arial" }}>
      <style>{`
        .fc-day-today { background: transparent !important; }
        .fc-timegrid-now-indicator { border-color: red !important; border-width: 2px; }
      `}</style>

      <h1 style={{ textAlign: "center", color: "#2c3e50" }}>Provider Dashboard</h1>

      {/* Create / Edit Service */}
      <section style={{ marginBottom: "40px" }}>
        <h2 style={{ color: "#34495e" }}>
          {editingId === null ? "Create Service" : "Edit Service"}
        </h2>
        <form onSubmit={handleSubmit} style={{ marginBottom: "20px" }}>
          <input
            type="text"
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            style={{ width: "100%", padding: "10px", marginBottom: "10px", borderRadius: "5px" }}
          />
          <input
            type="text"
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            style={{ width: "100%", padding: "10px", marginBottom: "10px", borderRadius: "5px" }}
          />
          <input
            type="number"
            placeholder="Price"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            style={{ width: "100%", padding: "10px", marginBottom: "10px", borderRadius: "5px" }}
          />
          <button
            type="submit"
            style={{
              padding: "10px 20px",
              backgroundColor: "#3498db",
              color: "#fff",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            {editingId === null ? "Create Service" : "Update Service"}
          </button>
        </form>
      </section>

      {/* Services List */}
      <section style={{ marginBottom: "40px" }}>
        <h2 style={{ color: "#34495e" }}>Services</h2>
        {services.map((s) => (
          <div
            key={s.id}
            style={{
              border: "1px solid #ccc",
              padding: "15px",
              marginBottom: "10px",
              borderRadius: "5px",
              backgroundColor: "#ecf0f1",
            }}
          >
            <h3 style={{ margin: "0 0 5px 0" }}>{s.title}</h3>
            <p style={{ margin: "0 0 5px 0" }}>{s.description}</p>
            <p style={{ margin: 0, fontWeight: "bold" }}>
              {s.price} FCFA
            </p>
            <div style={{ marginTop: "10px" }}>
              <button
                onClick={() => handleEdit(s)}
                style={{
                  marginRight: "10px",
                  padding: "5px 10px",
                  backgroundColor: "#3498db",
                  color: "#fff",
                  border: "none",
                  borderRadius: "3px",
                  cursor: "pointer",
                }}
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(s.id)}
                style={{
                  padding: "5px 10px",
                  backgroundColor: "#e74c3c",
                  color: "#fff",
                  border: "none",
                  borderRadius: "3px",
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </section>

      {/* ================= WORKING HOURS UI ================= */}
      <section style={{ marginBottom: "40px" }}>
        <h2 style={{ color: "#34495e" }}>Set Working Hours</h2>

        <div style={{ display: "flex", gap: "10px", marginBottom: "10px", flexWrap: "wrap" }}>
          <select
            value={newHour.day}
            onChange={(e) => setNewHour({ ...newHour, day: e.target.value })}
            style={{ padding: "8px", borderRadius: "5px" }}
          >
            <option value="">Select Day</option>
            {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <input
            type="time"
            value={newHour.start}
            onChange={(e) => setNewHour({ ...newHour, start: e.target.value })}
            style={{ padding: "8px", borderRadius: "5px" }}
          />

          <input
            type="time"
            value={newHour.end}
            onChange={(e) => setNewHour({ ...newHour, end: e.target.value })}
            style={{ padding: "8px", borderRadius: "5px" }}
          />

          <button
            type="button"
            onClick={async () => {
              if (!newHour.day || !newHour.start || !newHour.end)
                return alert("Fill all fields");

              const updated = [...workingHours, newHour];
              setWorkingHours(updated);
              setNewHour({ day: "", start: "", end: "" });
              await persistWorkingHours(updated);
            }}
            style={{
              padding: "8px 12px",
              backgroundColor: "#27ae60",
              color: "#fff",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            Add
          </button>
        </div>

        {workingHours.length > 0 && (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {workingHours.map((h, i) => (
              <li
                key={i}
                style={{
                  padding: "5px 10px",
                  border: "1px solid #ccc",
                  borderRadius: "5px",
                  marginBottom: "5px",
                  backgroundColor: "#ecf0f1",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                {h.day}: {h.start} - {h.end}
                <button
                  type="button"
                  onClick={async () => {
                    const updated = workingHours.filter((_, idx) => idx !== i);
                    setWorkingHours(updated);
                    await persistWorkingHours(updated);
                  }}
                  style={{
                    backgroundColor: "#e74c3c",
                    color: "#fff",
                    border: "none",
                    borderRadius: "3px",
                    padding: "2px 6px",
                    cursor: "pointer",
                  }}
                >
                  X
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ================= FULL CALENDAR ================= */}
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        events={[...calendarEvents, ...workingEvents]}
        eventClick={handleEventClick}
        height="auto"
        slotMinTime="08:00:00"
        slotMaxTime="20:00:00"
        allDaySlot={false}
        nowIndicator={true}
        weekNumbers={true}
        dayHeaderFormat={{ weekday: "short", day: "numeric" }}
        slotDuration="00:30:00"
        slotLabelInterval="01:00"
        slotLabelFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}

        eventDidMount={(info) => {
          
          if (info.event.backgroundColor === "#3498db") {
            info.el.style.height = "auto";
            info.el.style.width = "100%";         
            info.el.style.whiteSpace = "nowwrap"; 
            info.el.style.overflow = "hidden";
            info.el.style.padding = "6px 8px";
            info.el.style.fontSize = "16px";      
            info.el.style.lineHeight = "1.4";
            info.el.style.display = "flex";
            info.el.style.alignItems = "center";
            // === TOOLTIP ===
            info.el.setAttribute("title", info.event.extendedProps.tooltip);
          }
        }}
      />
    </div>
  );
}

