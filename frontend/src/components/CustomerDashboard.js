import React, { useState, useEffect, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

const API_URL = "/api";

export default function CustomerDashboard() {
  const [services, setServices] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState(null);
  const [slot, setSlot] = useState("");
  const [calendarEvents, setCalendarEvents] = useState([]);

  const getToken = () => localStorage.getItem("token");

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
      setAppointments(Array.isArray(data) ? data.filter(a => a.status === "booked") : []);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => {
    fetchServices();
    fetchAppointments();
  }, [fetchServices, fetchAppointments]);

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    if (!slot) return alert("Please enter a slot");
    const isoSlot = new Date(slot).toISOString();
    try {
      await fetch(`${API_URL}/appointments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + getToken(),
        },
        body: JSON.stringify({
          serviceId: Number(selectedServiceId),
          slot: isoSlot,
        }),
      });
      setSlot("");
      setSelectedServiceId(null);
      fetchAppointments();
      fetchServices();
    } catch (err) { console.error(err); }
  };

  const handleCancelAppointment = async (appointmentId) => {
    try {
      await fetch(`${API_URL}/appointments/${appointmentId}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + getToken() },
      });
      fetchAppointments();
      fetchServices();
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (!selectedServiceId) return;
    const service = services.find(s => s.id === selectedServiceId);
    if (!service) return;

    Promise.all([
      fetch(`${API_URL}/working-hours?providerEmail=${service.providerEmail}`, { 
        headers: { Authorization: "Bearer " + getToken() } 
      }).then(res => res.json()),
      fetch(`${API_URL}/appointments`, { // Fetch all to see booked ones
        headers: { Authorization: "Bearer " + getToken() } 
      }).then(res => res.json())
    ])
    .then(([whData, bookedData]) => {
      const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      const today = new Date();
      
      // Generation des working hours pour la semaine actuelle
      let workingEvents = [];
      (whData.hours || []).forEach(h => {
        const dayIndex = dayMap[h.day];
        const date = new Date(today);
        date.setDate(today.getDate() - today.getDay() + dayIndex); // Trouve la date exacte du jour
        
        const [sh, sm] = h.start.split(":").map(Number);
        const [eh, em] = h.end.split(":").map(Number);
        const start = new Date(date); start.setHours(sh, sm, 0);
        const end = new Date(date); end.setHours(eh, em, 0);

        workingEvents.push({
          start: start.toISOString(),
          end: end.toISOString(),
          display: "background",
          backgroundColor: "#82e0aa",
        });
      });

      const bookedEvents = (bookedData || []).filter(a => a.status === "booked").map(a => ({
        start: a.slot,
        end: new Date(new Date(a.slot).getTime() + 30 * 60 * 1000).toISOString(),
        title: "❌ Already booked",
        backgroundColor: "#f1948a",
        borderColor: "#c0392b",
      }));

      setCalendarEvents([...workingEvents, ...bookedEvents]);
    }).catch(console.error);
  }, [selectedServiceId, services]);

  return (
    <div style={{ maxWidth: "800px", margin: "20px auto", padding: "20px", fontFamily: "Arial" }}>
      <style>{`
        .fc-day-today { background: transparent !important; }
        .fc-timegrid-now-indicator { border-color: red !important; border-width: 2px; }
      `}</style>

      <h1 style={{ textAlign: "center", color: "#2c3e50" }}>Customer Dashboard</h1>

      <section style={{ marginBottom: "40px" }}>
        <h2 style={{ color: "#34495e" }}>Available Services</h2>
        {services.map(s => (
          <div key={s.id} style={{ border: "1px solid #ccc", padding: "15px", marginBottom: "10px", borderRadius: "5px", backgroundColor: "#ecf0f1" }}>
            <h3 style={{ margin: "0 0 5px 0" }}>{s.title}</h3>
            <p style={{ margin: "0 0 5px 0" }}>{s.description}</p>
            <strong style={{ color: "#16a085" }}>{s.price} FCFA</strong><br />
            <button onClick={() => setSelectedServiceId(s.id)} style={{ marginTop: "10px", padding: "8px 12px", backgroundColor: "#3498db", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer" }}>Book Slot</button>
          </div>
        ))}
      </section>

      {selectedServiceId && (
        <section style={{ marginBottom: "40px" }}>
          <h2 style={{ color: "#34495e" }}>Book a Slot</h2>
          <form onSubmit={handleBookAppointment} style={{ marginBottom: "20px" }}>
            <input type="datetime-local" value={slot} onChange={e => setSlot(e.target.value)} required style={{ padding: "8px", borderRadius: "5px", marginRight: "10px" }} />
            <button type="submit" style={{ padding: "8px 12px", backgroundColor: "#27ae60", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer" }}>Confirm Booking</button>
          </form>
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            events={calendarEvents}
            height="auto"
            slotMinTime="06:00:00"
            slotMaxTime="22:00:00"
            allDaySlot={false}
            nowIndicator={true}
          />
        </section>
      )}

      <section>
        <h2 style={{ color: "#34495e" }}>My Appointments</h2>
        {appointments.map(a => (
          <div key={a.id} style={{ border: "1px solid #ccc", padding: "10px", marginBottom: "10px", borderRadius: "5px", backgroundColor: "#ecf0f1" }}>
            <strong>Service:</strong> {a.serviceTitle}<br />
            <strong>Slot:</strong> {new Date(a.slot).toLocaleString()}<br />
            <button onClick={() => handleCancelAppointment(a.id)} style={{ marginTop: "5px", padding: "5px 10px", backgroundColor: "#e74c3c", color: "#fff", border: "none", borderRadius: "3px", cursor: "pointer" }}>Cancel</button>
          </div>
        ))}
      </section>
    </div>
  );
}
