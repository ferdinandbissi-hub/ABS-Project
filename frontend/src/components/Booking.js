import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Booking = () => {
    const [services, setServices] = useState([]);
    const [selectedService, setSelectedService] = useState('');
    const [date, setDate] = useState('');
    const [timeSlots, setTimeSlots] = useState([]);
    const [selectedTime, setSelectedTime] = useState('');
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const fetchServices = async () => {
            try {
                const response = await axios.get('http://localhost:5000/services');
                setServices(response.data);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching services:", error);
                setLoading(false);
            }
        };

        fetchServices();
    }, []);

    const handleServiceChange = (e) => {
        setSelectedService(e.target.value);
        setTimeSlots([]);
        setSelectedTime('');
    };

    const handleDateChange = async (e) => {
        const selectedDate = e.target.value;
        setDate(selectedDate);

        if (selectedService) {
            try {
                const dayOfWeek = new Date(selectedDate).getUTCDay(); 
                const response = await axios.get(`http://localhost:5000/available-slots?day_of_week=${dayOfWeek}`);
                setTimeSlots(response.data.availableSlots);
            } catch (error) {
                console.error("Error fetching available slots:", error);
            }
        }
    };

    const handleTimeChange = (e) => {
        setSelectedTime(e.target.value);
    };

    const handleBooking = async () => {
        const appointmentTime = new Date(`${date}T${selectedTime}:00`).toISOString(); // Combine date and time

        try {
            const response = await axios.post('http://localhost:5000/appointments', {
                service_id: selectedService,
                appointment_time: appointmentTime,
            }, {
                headers: {
                    Authorization: `Bearer YOUR_JWT_TOKEN`, // Replace with actual token handling
                },
            });

            // Set message based on the booking response
            setMessage(`Appointment booked successfully! ID: ${response.data.id}`);
        } catch (error) {
            console.error("Error creating appointment:", error);
            setMessage("Failed to book appointment.");
        }
    };

    if (loading) {
        return <div>Loading services...</div>;
    }

    return (
        <div>
            <h2>Book an Appointment</h2>
            <div>
                <label>Select Service:</label>
                <select value={selectedService} onChange={handleServiceChange}>
                    <option value="">Select a service...</option>
                    {services.map(service => (
                        <option key={service.id} value={service.id}>
                            {service.name} - ${service.price}
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <label>Select Date:</label>
                <input type="date" value={date} onChange={handleDateChange} />
            </div>

            <div>
                <label>Select Time:</label>
                <select value={selectedTime} onChange={handleTimeChange} disabled={!date || !selectedService}>
                    <option value="">Select a time...</option>
                    {timeSlots.map((time, index) => (
                        <option key={index} value={time}>
                            {time}
                        </option>
                    ))}
                </select>
            </div>

            <button onClick={handleBooking} disabled={!selectedService || !date || !selectedTime}>
                Confirm Booking
            </button>

            {message && <p>{message}</p>}
        </div>
    );
};

export default Booking;
