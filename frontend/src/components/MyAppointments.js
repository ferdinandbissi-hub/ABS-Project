import React, { useState, useEffect } from 'react';
import axios from 'axios';

const MyAppointments = () => {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const fetchAppointments = async () => {
            const token = localStorage.getItem('token'); // Retrieve the token
            try {
                const response = await axios.get('http://localhost:5000/appointments', {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                setAppointments(response.data);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching appointments:", error);
                setMessage("Failed to fetch appointments.");
                setLoading(false);
            }
        };

        fetchAppointments();
    }, []);

    if (loading) {
        return <div>Loading appointments...</div>;
    }

    return (
        <div>
            <h2>My Appointments</h2>
            {message && <p>{message}</p>}
            {appointments.length === 0 ? (
                <p>No appointments found.</p>
            ) : (
                <ul>
                    {appointments.map(appointment => (
                        <li key={appointment.id}>
                            <strong>Service:</strong> {appointment.service_id} <br />
                            <strong>Appointment Time:</strong> {new Date(appointment.appointment_time).toLocaleString()} <br />
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default MyAppointments;
