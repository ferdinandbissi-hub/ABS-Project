import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ServiceSelection = () => {
    const [services, setServices] = useState([]);
    const [selectedService, setSelectedService] = useState('');
    const [loading, setLoading] = useState(true);

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

    const handleSelect = (e) => {
        setSelectedService(e.target.value);
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <h2>Select a Service</h2>
            <select value={selectedService} onChange={handleSelect}>
                <option value="">Select a service...</option>
                {services.map(service => (
                    <option key={service.id} value={service.id}>
                        {service.name} - ${service.price}
                    </option>
                ))}
            </select>
            <div>
                {selectedService && <p>You have selected service ID: {selectedService}</p>}
            </div>
        </div>
    );
};

export default ServiceSelection;
