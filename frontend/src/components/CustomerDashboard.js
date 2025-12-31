import React, { useState, useEffect, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

export default function CustomerDashboard() {
  const [services, setServices] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState(null);
  const [slot, setSlot] = useState("");
  const [calendarEvents, setCalendarEvents] = useState([]);

  const getToken = () => localStorage.getItem("token");

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

  // Book an appointment
  const handleBookAppointment = async (e) => {
    e.preventDefault();
    if (!slot) return alert("Please enter a slot");

    const isoSlot = new Date(slot).toISOString();

    try {
      await fetch("http://localhost:5000/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + getToken(),
        },
        body: JSON.stringify({
          serviceId: Number(selectedServiceId),
          slot: isoSlot
        }),
      });
      setSlot("");
      setSelectedServiceId(null);
      fetchAppointments();
      fetchServices();
    } catch (err) {
      console.error(err);
    }
  };

  // Filter out services already booked by this customer
  const availableServices = services.filter(
    (s) => !appointments.some((a) => a.serviceId === s.id)
  );

  // Fetch provider working hours and merge booked appointments
  useEffect(() => {
    if (!selectedServiceId) return;
    const service = services.find((s) => s.id === selectedServiceId);
    if (!service) return;

    // Fetch working hours
    fetch(`http://localhost:5000/working-hours?providerEmail=${service.providerEmail}`, {
      headers: { Authorization: "Bearer " + getToken() },
    })
      .then((res) => res.json())
      .then((data) => {
        const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
        const workingEvents = (data.hours || []).map((h) => {
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
            backgroundColor: "#d0d0d0", // gray for unavailable slots
            borderColor: "#a0a0a0",
          };
        });

        // Merge booked appointments for this provider
        const bookedAppointments = appointments
          .filter(a => {
            const s = services.find(s => s.id === a.serviceId);
            return s && s.providerEmail === service.providerEmail && a.status === "booked";
          })
          .map(a => ({
            start: a.slot,
            end: new Date(new Date(a.slot).getTime() + 30 * 60 * 1000), // assume 30min slot
            title: a.serviceTitle,
            backgroundColor: "#3498db",
            borderColor: "#2980b9",
          }));

        setCalendarEvents([...workingEvents, ...bookedAppointments]);
      })
      .catch(console.error);
  }, [selectedServiceId, services, appointments]);

  return (
    <div style={{ maxWidth: "800px", margin: "20px auto", padding: "20px", fontFamily: "Arial" }}>
      <h1 style={{ textAlign: "center", color: "#2c3e50" }}>Customer Dashboard</h1>

      {/* Available Services */}
      <section style={{ marginBottom: "40px" }}>
        <h2 style={{ color: "#34495e" }}>Available Services</h2>
        {availableServices.length > 0 ? (
          availableServices.map((s) => (
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
              <button
                onClick={() => setSelectedServiceId(s.id)}
                style={{
                  marginTop: "10px",
                  padding: "5px 10px",
                  backgroundColor: "#3498db",
                  color: "#fff",
                  border: "none",
                  borderRadius: "3px",
                  cursor: "pointer",
                }}
              >
                Book Slot
              </button>
            </div>
          ))
        ) : (
          <p>No services available.</p>
        )}
      </section>

      {/* Book Slot Form */}
      {selectedServiceId && (
        <section style={{ marginBottom: "40px" }}>
          <h2 style={{ color: "#34495e" }}>Book a Slot for Service</h2>
          <form onSubmit={handleBookAppointment}>
            <input
              type="datetime-local"
              value={slot}
              onChange={(e) => setSlot(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px",
                marginBottom: "10px",
                borderRadius: "5px",
              }}
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
              Book Appointment
            </button>
          </form>

          {/* FullCalendar with working hours + booked appointments */}
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            events={calendarEvents}
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
          />
        </section>
      )}

      {/* My Appointments */}
      <section>
        <h2 style={{ color: "#34495e" }}>My Appointments</h2>
        {appointments.length > 0 ? (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {appointments.map((a) => (
              <li
                key={a.id}
                style={{
                  padding: "10px",
                  border: "1px solid #ccc",
                  borderRadius: "5px",
                  marginBottom: "10px",
                  backgroundColor: "#f1c40f20",
                }}
              >
                <strong>Customer Email:</strong> {a.customerEmail} <br />
                <strong>Service:</strong> {a.serviceTitle} <br />
                <strong>Slot:</strong> {a.slot} <br />
              </li>
            ))}
          </ul>
        ) : (
          <p>No appointments yet.</p>
        )}
      </section>
    </div>
  );
}

