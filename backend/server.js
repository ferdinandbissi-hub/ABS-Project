require('dotenv').config();

const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const path = require("path");
const db = require("./db"); // SQLite connection

const app = express();
app.use(cors({
  origin: "https://abs-project-frontend.onrender.com", 
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(bodyParser.json());

const SECRET = process.env.JWT_SECRET || "default_secret";
const DOLLAR_TO_FCFA = Number(process.env.DOLLAR_TO_FCFA) || 650;
const apiRouter = express.Router();


/* ================= AUTH ================= */
app.post("/register", (req, res) => {
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

app.post("/login", (req, res) => {
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

/* ================= SERVICES ================= */
app.post("/services", auth, (req, res) => {
  if (req.user.role !== "provider")
    return res.status(403).json({ message: "Forbidden" });

  const { title, description, price } = req.body;
  const priceFCFA = price * DOLLAR_TO_FCFA;
  
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

app.get("/services", auth, (req, res) => {
  if (req.user.role === "provider") {
    db.all(
      "SELECT * FROM services WHERE providerEmail = ?",
      [req.user.email],
      (err, rows) => {
        if (err) return res.status(500).json({ message: "Database error" });
        res.json(rows);
      }
    );
  } else {
    db.all(
      "SELECT id FROM appointments WHERE customerEmail = ? AND status = 'booked'",
      [req.user.email],
      (err, booked) => {
        if (err) return res.status(500).json({ message: "Database error" });
        const bookedIds = booked.map(a => a.id);

        db.all(
          "SELECT * FROM services",
          [],
          (err, services) => {
            if (err) return res.status(500).json({ message: "Database error" });
            const available = services.filter(s => !bookedIds.includes(s.id));
            res.json(available);
          }
        );
      }
    );
  }
});

app.put("/services/:id", auth, (req, res) => {
  if (req.user.role !== "provider")
    return res.status(403).json({ message: "Forbidden" });

  const id = Number(req.params.id);
  const { title, description, price } = req.body;
  const priceFCFA = price * DOLLAR_TO_FCFA;

  db.run(
    "UPDATE services SET title = ?, description = ?, price = ? WHERE id = ? AND providerEmail = ?",
    [title, description, price, id, req.user.email],
    function(err) {
      if (err) return res.status(500).json({ message: "Database error" });
      if (this.changes === 0) return res.status(404).json({ message: "Service not found" });

      db.get("SELECT * FROM services WHERE id = ?", [id], (err, service) => {
        res.json(service);
      });
    }
  );
});

// === DELETE SERVICE + cancel all related appointments
app.delete("/services/:id", auth, (req, res) => {
  if (req.user.role !== "provider")
    return res.status(403).json({ message: "Forbidden" });

  const id = Number(req.params.id);
  db.run(
    "DELETE FROM services WHERE id = ? AND providerEmail = ?",
    [id, req.user.email],
    function(err) {
      if (err) return res.status(500).json({ message: "Database error" });

      // Mark related appointments as cancelled
      db.run(
        "UPDATE appointments SET status = 'cancelled' WHERE serviceId = ?",
        [id],
        () => res.json({ message: "Service deleted and related appointments cancelled" })
      );
    }
  );
});

/* ================= APPOINTMENTS ================= */
app.get("/provider-appointments/:providerEmail", auth, (req, res) => {
  const { providerEmail } = req.params;

  db.all(
    `SELECT a.*, s.title as serviceTitle
     FROM appointments a
     JOIN services s ON a.serviceId = s.id
     WHERE s.providerEmail = ?
     AND a.status = 'booked'`,
    [providerEmail],
    (err, rows) => {
      if (err) return res.status(500).json({ message: "Database error" });
      res.json(rows);
    }
  );
});

app.post("/appointments", auth, (req, res) => {
  if (req.user.role !== "customer")
    return res.status(403).json({ message: "Forbidden" });

  const { serviceId, slot } = req.body;

  db.run(
    "INSERT INTO appointments (serviceId, customerEmail, slot, status) VALUES (?, ?, ?, 'booked')",
    [serviceId, req.user.email, slot],
    function(err) {
      if (err) return res.status(500).json({ message: "Database error" });
      res.json({ message: "Appointment booked successfully" });
    }
  );
});

// === DELETE APPOINTMENT (persistent)
app.delete("/appointments/:id", auth, (req, res) => {
  const id = Number(req.params.id);

  db.run(
    "UPDATE appointments SET status = 'cancelled' WHERE id = ? AND customerEmail = ?",
    [id, req.user.email],
    function(err) {
      if (err) return res.status(500).json({ message: "Database error" });
      if (this.changes === 0) return res.status(404).json({ message: "Appointment not found" });
      res.json({ message: "Appointment cancelled successfully" });
    }
  );
});

app.get("/appointments", auth, (req, res) => {
  if (req.user.role === "provider") {
    db.all(
      `SELECT a.*, s.title as serviceTitle
       FROM appointments a
       JOIN services s ON a.serviceId = s.id
       WHERE s.providerEmail = ?
       AND a.status = 'booked'`,
      [req.user.email],
      (err, rows) => {
        if (err) return res.status(500).json({ message: "Database error" });
        res.json(rows);
      }
    );
  } else {
    db.all(
      `SELECT a.*, s.title as serviceTitle
       FROM appointments a
       LEFT JOIN services s ON a.serviceId = s.id
       WHERE a.customerEmail = ?`,
      [req.user.email],
      (err, rows) => {
        if (err) return res.status(500).json({ message: "Database error" });
        res.json(rows);
      }
    );
  }
});


/* ================= WORKING HOURS ================= */
app.get("/working-hours", auth, (req, res) => {
  const providerEmail =
    req.user.role === "provider"
      ? req.user.email
      : req.query.providerEmail;

  if (!providerEmail)
    return res.status(400).json({ message: "Provider email required" });

  db.get(
    "SELECT hours FROM working_hours WHERE providerEmail = ?",
    [providerEmail],
    (err, row) => {
      if (err) return res.status(500).json({ message: "Database error" });
      res.json(row ? { hours: JSON.parse(row.hours) } : { hours: [] });
    }
  );
});


app.post("/working-hours", auth, (req, res) => {
  if (req.user.role !== "provider") return res.status(403).json({ message: "Forbidden" });

  const { hours } = req.body;

  db.run(
    "REPLACE INTO working_hours (providerEmail, hours) VALUES (?, ?)",
    [req.user.email, JSON.stringify(hours)],
    (err) => {
      if (err) return res.status(500).json({ message: "Database error" });
      res.json({ message: "Working hours saved successfully" });
    }
  );
});

app.use("/api", apiRouter);

/* ================= FRONTEND ================= */
const frontendPath = path.join(__dirname, "..", "frontend", "build");

app.use(express.static(frontendPath));

app.get("*", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});


/* ================= START SERVER ================= */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

