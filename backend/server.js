require('dotenv').config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const path = require("path");
const db = require("./db");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const SECRET = process.env.JWT_SECRET || "default_secret";
const DOLLAR_TO_FCFA = Number(process.env.DOLLAR_TO_FCFA) || 650;

/* ================= AUTH MIDDLEWARE ================= */
function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token" });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
}

/* ================= AUTH ================= */
app.post("/api/register", (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password || !role)
    return res.status(400).json({ message: "All fields required" });

  db.run(
    "INSERT INTO users (email, password, role) VALUES (?, ?, ?)",
    [email, password, role],
    function(err) {
      if (err) return res.status(400).json({ message: "User exists" });
      const token = jwt.sign({ email, role }, SECRET);
      res.json({ token, role });
    }
  );
});

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  db.get(
    "SELECT * FROM users WHERE email = ? AND password = ?",
    [email, password],
    (err, user) => {
      if (err) return res.status(500).json({ message: "Database error" });
      if (!user) return res.status(400).json({ message: "Please register" });
      const token = jwt.sign({ email: user.email, role: user.role }, SECRET);
      res.json({ token, role: user.role });
    }
  );
});

/* ================= SERVICES ================= */
// CREATE
app.post("/api/services", auth, (req, res) => {
  if (req.user.role !== "provider")
    return res.status(403).json({ message: "Forbidden" });

  const { title, description, price } = req.body;
  db.run(
    "INSERT INTO services (providerEmail, title, description, price) VALUES (?, ?, ?, ?)",
    [req.user.email, title, description, price],
    function(err) {
      if (err) return res.status(500).json({ message: "Database error" });
      db.get("SELECT * FROM services WHERE id = ?", [this.lastID], (err, service) => {
        res.json(service);
      });
    }
  );
});

// READ
app.get("/api/services", auth, (req, res) => {
  if (req.user.role === "provider") {
    db.all("SELECT * FROM services WHERE providerEmail = ?", [req.user.email], (err, rows) => {
      if (err) return res.status(500).json({ message: "Database error" });
      res.json(rows);
    });
  } else {
    db.all("SELECT serviceId FROM appointments WHERE customerEmail = ? AND status = 'booked'", [req.user.email], (err, booked) => {
      const bookedIds = (booked || []).map(a => a.serviceId);
      db.all("SELECT * FROM services", [], (err, services) => {
        if (err) return res.status(500).json({ message: "Database error" });
        const available = services.filter(s => !bookedIds.includes(s.id));
        res.json(available);
      });
    });
  }
});

// UPDATE
app.put("/api/services/:id", auth, (req, res) => {
  if (req.user.role !== "provider")
    return res.status(403).json({ message: "Forbidden" });

  const { title, description, price } = req.body;
  db.run(
    "UPDATE services SET title = ?, description = ?, price = ? WHERE id = ? AND providerEmail = ?",
    [title, description, price, req.params.id, req.user.email],
    function(err) {
      if (err) return res.status(500).json({ message: "Database error" });
      db.get("SELECT * FROM services WHERE id = ?", [req.params.id], (err, service) => res.json(service));
    }
  );
});

// DELETE
app.delete("/api/services/:id", auth, (req, res) => {
  if (req.user.role !== "provider")
    return res.status(403).json({ message: "Forbidden" });

  db.run(
    "DELETE FROM services WHERE id = ? AND providerEmail = ?",
    [req.params.id, req.user.email],
    function(err) {
      if (err) return res.status(500).json({ message: "Database error" });
      db.run("UPDATE appointments SET status = 'cancelled' WHERE serviceId = ?", [req.params.id], () => {
        res.json({ message: "Service deleted and related appointments cancelled" });
      });
    }
  );
});

/* ================= WORKING HOURS ================= */
app.get("/api/working-hours", auth, (req, res) => {
  const email = req.user.role === "provider" ? req.user.email : req.query.providerEmail;
  if (!email) return res.status(400).json({ message: "Provider email required" });

  db.get("SELECT hours FROM working_hours WHERE providerEmail = ?", [email], (err, row) => {
    if (err) return res.status(500).json({ message: "Database error" });
    res.json(row ? { hours: JSON.parse(row.hours) } : { hours: [] });
  });
});

app.post("/api/working-hours", auth, (req, res) => {
  if (req.user.role !== "provider") return res.status(403).json({ message: "Forbidden" });
  db.run(
    "REPLACE INTO working_hours (providerEmail, hours) VALUES (?, ?)",
    [req.user.email, JSON.stringify(req.body.hours)],
    (err) => {
      if (err) return res.status(500).json({ message: "Database error" });
      res.json({ message: "Working hours saved successfully" });
    }
  );
});

/* ================= APPOINTMENTS ================= */
/* ================= APPOINTMENTS ================= */
app.get("/api/appointments", auth, (req, res) => {
  // On ajoute s.price dans la sélection SQL pour que le frontend le reçoive
  const query = req.user.role === "provider"
    ? `SELECT a.*, s.title as serviceTitle, s.price 
       FROM appointments a 
       JOIN services s ON a.serviceId = s.id 
       WHERE s.providerEmail = ? AND a.status = 'booked'`
    : `SELECT a.*, s.title as serviceTitle, s.price 
       FROM appointments a 
       LEFT JOIN services s ON a.serviceId = s.id 
       WHERE a.customerEmail = ?`;

  db.all(query, [req.user.email], (err, rows) => {
    if (err) return res.status(500).json({ message: "Database error" });
    res.json(rows || []);
  });
});

app.post("/api/appointments", auth, (req, res) => {
  if (req.user.role !== "customer") return res.status(403).json({ message: "Forbidden" });
  const { serviceId, slot } = req.body;
  db.run(
    "INSERT INTO appointments (serviceId, customerEmail, slot, status) VALUES (?, ?, ?, 'booked')",
    [serviceId, req.user.email, slot],
    (err) => {
      if (err) return res.status(500).json({ message: "Database error" });
      res.json({ message: "Appointment booked successfully" });
    }
  );
});

app.delete("/api/appointments/:id", auth, (req, res) => {
  db.run(
    "UPDATE appointments SET status = 'cancelled' WHERE id = ? AND (customerEmail = ? OR EXISTS(SELECT 1 FROM services s WHERE s.id = appointments.serviceId AND s.providerEmail = ?))",
    [req.params.id, req.user.email, req.user.email],
    function(err) {
      if (err) return res.status(500).json({ message: "Database error" });
      res.json({ message: "Appointment cancelled successfully" });
    }
  );
});

/* ================= FRONTEND ================= */
const frontendPath = path.join(__dirname, "../frontend/build");
app.use(express.static(frontendPath));
app.get("*", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
