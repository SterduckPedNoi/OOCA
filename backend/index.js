/* eslint-disable @typescript-eslint/no-require-imports */
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Initialize SQLite database
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    db.run(`CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patientName TEXT NOT NULL,
      appointmentAt TEXT NOT NULL,
      status TEXT CHECK( status IN ('pending', 'confirmed', 'cancelled') ) DEFAULT 'pending',
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    )`);
  }
});

// Helper function to check for overlaps
const checkOverlap = (appointmentAt) => {
  return new Promise((resolve, reject) => {
    const newAppointmentTime = new Date(appointmentAt).getTime();
    const thirtyMinutes = 30 * 60 * 1000;
    
    db.all(`SELECT appointmentAt FROM appointments WHERE status != 'cancelled'`, [], (err, rows) => {
      if (err) {
        return reject(err);
      }
      for (let row of rows) {
        const existingTime = new Date(row.appointmentAt).getTime();
        if (Math.abs(newAppointmentTime - existingTime) < thirtyMinutes) {
          return resolve(true); // Overlaps
        }
      }
      resolve(false); // No overlap
    });
  });
};

// ==========================================
// Auto-Cancel Cron (Runs every 1 minute)
// ==========================================
setInterval(() => {
  const now = new Date();
  
  db.all(`SELECT * FROM appointments WHERE status = 'pending'`, [], (err, rows) => {
    if (err) {
      console.error('[Auto-Cancel] Error fetching pending appointments:', err);
      return;
    }
    
    for (const appt of rows) {
      const appointmentTime = new Date(appt.appointmentAt);
      
      // If the appointment time has already passed
      if (appointmentTime < now) {
        db.run(`UPDATE appointments SET status = 'cancelled' WHERE id = ?`, [appt.id], (updateErr) => {
          if (updateErr) {
            console.error(`[Auto-Cancel] Failed to cancel appointment #${appt.id}:`, updateErr);
          } else {
            console.log(`[Auto-Cancel] Appointment #${appt.id} (${appt.patientName}) cancelled because the time has passed.`);
          }
        });
      }
    }
  });
}, 60 * 1000); // 60,000 ms = 1 minute

// 1. POST /appointments
app.post('/appointments', async (req, res) => {
  const { patientName, appointmentAt, status = 'pending' } = req.body;
  
  if (!patientName) return res.status(400).json({ error: "patientName cannot be empty" });
  if (!appointmentAt) return res.status(400).json({ error: "appointmentAt is required" });
  if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  
  const appointmentDate = new Date(appointmentAt);
  const now = new Date();
  
  if (appointmentDate <= now) {
    return res.status(400).json({ error: "appointmentAt must be in the future" });
  }

  try {
    const overlaps = await checkOverlap(appointmentAt);
    if (overlaps) {
      return res.status(409).json({ error: "Time slot overlaps with an existing appointment" });
    }
    
    const query = `INSERT INTO appointments (patientName, appointmentAt, status) VALUES (?, ?, ?)`;
    db.run(query, [patientName, appointmentAt, status], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id: this.lastID, patientName, appointmentAt, status });
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. GET /appointments
app.get('/appointments', (req, res) => {
  const status = req.query.status;
  let query = 'SELECT * FROM appointments';
  let params = [];
  
  if (status) {
    if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: "Invalid status parameter" });
    }
    query += ' WHERE status = ?';
    params.push(status);
  }
  
  query += ' ORDER BY appointmentAt ASC';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(200).json(rows);
  });
});

// 3. PATCH /appointments/:id
app.patch('/appointments/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: "status must be one of 'pending', 'confirmed', 'cancelled'" });
  }
  
  db.run(`UPDATE appointments SET status = ? WHERE id = ?`, [status, id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: "Appointment not found" });
    }
    res.status(200).json({ message: "Status updated successfully" });
  });
});

// 4. DELETE /appointments/:id (Extra for UI completion)
app.delete('/appointments/:id', (req, res) => {
  const { id } = req.params;
  
  db.run(`DELETE FROM appointments WHERE id = ?`, id, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: "Appointment not found" });
    }
    res.status(200).json({ message: "Appointment deleted successfully" });
  });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
