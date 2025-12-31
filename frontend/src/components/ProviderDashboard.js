import React, { useState, useEffect, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

export default function ProviderDashboard() {
  const [services, setServices] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [form, setForm] = useState({ title: "", description: "", price: "" });
  const [editingId, setEditingId] = useState(null);

  const getToken = () => localStorage.getItem("token");

  // Fetch services
  const fetchServices = useCallback(async () => {
    try {
      const res = await fetch("http://localhost:5000/services", {
        headers: { Authorization: "Bearer " + getToken() },
      });
      const data = await res.json();
      setServices(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Fetch appointments
  const fetchAppointments = useCallback(async () => {
    try {
      const res = await fetch("http://localhost:5000/appointments", {
        headers: { Authorization: "Bearer " + getToken() },
      });
      const data = await res.json();
      setAppointments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchServices();
    fetchAppointments();
  }, [fetchServices, fetchAppointments]);

  // Create or update service
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.price) return alert("Title and price are required");

    try {
      if (editingId === null) {
        // Create
        await fetch("http://localhost:5000/services", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + getToken(),
          },
          body: JSON.stringify(form),
        });
      } else {
        // Update
        await fetch(`http://localhost:5000/services/${editingId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + getToken(),
          },
          body: JSON.stringify(form),
        });
      }
      setForm({ title: "", description: "", price: "" });
      setEditingId(null);
      fetchServices();
      fetchAppointments();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (service) => {
    setForm({ title: service.title, description: service.description, price: service.price });
    setEditingId(service.id);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this service?")) return;
    try {
      await fetch(`http://localhost:5000/services/${id}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + getToken() },
      });
      fetchServices();
      fetchAppointments();
    } catch (err) {
      console.error(err);
    }
  };
  
  const [workingHours, setWorkingHours] = useState([]);

  // Fetch working hours
  const fetchWorkingHours = useCallback(async () => {
    try {
      const res = await fetch("http://localhost:5000/working-hours", {
        headers: { Authorization: "Bearer " + getToken() },
      });
      const data = await res.json();
      setWorkingHours(data.hours || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchWorkingHours();
  }, [fetchWorkingHours]);

  // eslint-disable-next-line no-unused-vars
  const handleSaveWorkingHours = async () => {
    try {
      await fetch("http://localhost:5000/working-hours", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + getToken(),
        },
        body: JSON.stringify({ hours: workingHours }),
      });
      fetchWorkingHours();
    } catch (err) {
      console.error(err);
    }
  };

  // Convert workingHours en background events
  const workingEvents = workingHours.flatMap(h => {
    const dayMap = { "Mon": 1, "Tue": 2, "Wed": 3, "Thu": 4, "Fri": 5, "Sat": 6, "Sun": 0 };
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
      backgroundColor: "#27ae60", // 🔹 vert plus visible
      borderColor: "#1e8449",     // 🔹 bord plus foncé pour contraste
    };
  });

  // --- HANDLE APPOINTMENT CLICK (CANCEL) ---
  const handleEventClick = async (clickInfo) => {
    if (!window.confirm("Do you want to cancel this appointment?")) return;

    try {
      await fetch(`http://localhost:5000/appointments/${clickInfo.event.id}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + getToken() },
      });
      fetchAppointments();
    } catch (err) {
      console.error(err);
    }
  };

  // Map appointments to FullCalendar events
  const calendarEvents = appointments
    .filter(a => a.status === "booked") // ne prendre que les rendez-vous actifs
    .map(a => ({
      id: a.id,
      title: `${a.serviceTitle} - ${a.customerEmail}`,
      start: a.slot,
      end: new Date(new Date(a.slot).getTime() + 30 * 60 * 1000),
    }));


  return (
    <div style={{ maxWidth: "900px", margin: "20px auto", padding: "20px", fontFamily: "Arial" }}>
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
            <p style={{ margin: 0, fontWeight: "bold" }}>${s.price}</p>
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

      {/* Full Calendar */}
      <section>
        <h2 style={{ color: "#34495e" }}>My Schedule</h2>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          events={[...calendarEvents, ...workingEvents]}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          eventClick={handleEventClick}
          height="auto"
          slotMinTime="08:00:00"
          slotMaxTime="20:00:00"
          allDaySlot={false}
          nowIndicator={true}
          weekNumbers={true}
          dayHeaderFormat={{ weekday: 'short', day: 'numeric' }}
          slotDuration="00:30:00"
          slotLabelInterval="01:00"
          slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
          eventContent={(eventInfo) => (
            <div
              style={{
                fontSize: "16px",
                fontWeight: "600",
                color: "#2c3e50",
                padding: "8px",
                whiteSpace: "normal",
                lineHeight: "1.5",
                minHeight: "60px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                backgroundColor: "#f9f9f9",
                borderRadius: "5px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }}
            >
              <strong style={{ fontSize: "18px", color: "#2980b9" }}>{eventInfo.event.title}</strong>
              <span style={{ fontSize: "14px", color: "#34495e", marginTop: "2px" }}>
                {new Date(eventInfo.event.start).toLocaleString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  day: '2-digit',
                  month: 'short'
                })}
              </span>
              <span style={{ fontSize: "12px", color: "#7f8c8d", marginTop: "2px" }}>
                {eventInfo.event.extendedProps.status || ""}
              </span>
            </div>
          )}
        />
      </section>
    </div>
  );
}

