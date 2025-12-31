import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import RegisterLogin from "./components/RegisterLogin";
import ProviderDashboard from "./components/ProviderDashboard";
import CustomerDashboard from "./components/CustomerDashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RegisterLogin />} />
        <Route path="/provider" element={<ProviderDashboard />} />
        <Route path="/customer" element={<CustomerDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

