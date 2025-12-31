import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ManageAppointments = () => {
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

    const cancelAppointment = async (id) => {
        const token = localStorage.getItem('token'); // Retrieve the token
        try {
            await axios.delete(`http://localhost:5000/appointments/${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setAppointments(appointments.filter(appointment => appointment.id !== id)); // Update state
            setMessage('Appointment canceled successfully.');
        } catch (error) {
            console.error("Error canceling appointment:", error);
            setMessage('Failed to cancel appointment.');
        }
    };

    if (loading) {
        return <div>Loading appointments...</div>;
    }

    return (
        <div>
            <h2>Manage Appointments</h2>
            {message && <p>{message}</p>}
            {appointments.length === 0 ? (
                <p>No appointments found.</p>
            ) : (
                <ul>
                    {appointments.map(appointment => (
                        <li key={appointment.id}>
                            <strong>Service ID:</strong> {appointment.service_id} <br />
                            <strong>Appointment Time:</strong> {new Date(appointment.appointment_time).toLocaleString()} <br />
                            <button onClick={() => cancelAppointment(appointment.id)}>
                                Cancel Appointment
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default ManageAppointments;
