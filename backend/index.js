const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Initialize SQLite Database
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    db.run(`
      CREATE TABLE IF NOT EXISTS appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patientName TEXT NOT NULL,
        appointmentAt TEXT NOT NULL,
        status TEXT CHECK(status IN ('pending', 'confirmed', 'cancelled')) DEFAULT 'pending',
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
});

// Helper function to check if a date is in the future
const isFutureDate = (dateString) => {
  const appointmentDate = new Date(dateString);
  const now = new Date();
  return appointmentDate > now;
};

// Helper function to check for overlaps
const checkOverlap = (appointmentAt) => {
  return new Promise((resolve, reject) => {
    const newAppointmentTime = new Date(appointmentAt).getTime();
    
    // Each appointment is 30 minutes (1800000 ms)
    const thirtyMinutes = 30 * 60 * 1000;
    
    db.all(`SELECT appointmentAt FROM appointments WHERE status != 'cancelled'`, [], (err, rows) => {
      if (err) return reject(err);
      
      for (const row of rows) {
        const existingTime = new Date(row.appointmentAt).getTime();
        
        // Overlap condition: if absolute difference is strictly less than 30 minutes
        if (Math.abs(newAppointmentTime - existingTime) < thirtyMinutes) {
          return resolve(true); // Overlaps
        }
      }
      resolve(false); // No overlap
    });
  });
};

// 1. POST /appointments
app.post('/appointments', async (req, res) => {
  const { patientName, appointmentAt } = req.body;

  // Validate input
  if (!patientName || patientName.trim() === '') {
    return res.status(400).json({ error: 'patientName cannot be empty' });
  }
  
  if (!appointmentAt || isNaN(new Date(appointmentAt).getTime())) {
    return res.status(400).json({ error: 'invalid appointmentAt format' });
  }

  if (!isFutureDate(appointmentAt)) {
    return res.status(400).json({ error: 'appointmentAt must be in the future' });
  }

  try {
    // Check business rule: no overlapping appointments
    const isOverlapping = await checkOverlap(appointmentAt);
    if (isOverlapping) {
      return res.status(409).json({ error: '409 Conflict: Appointment overlaps with an existing one' });
    }

    // Insert into DB
    const sql = `INSERT INTO appointments (patientName, appointmentAt, status) VALUES (?, ?, 'pending')`;
    db.run(sql, [patientName.trim(), appointmentAt], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({
        id: this.lastID,
        patientName: patientName.trim(),
        appointmentAt,
        status: 'pending'
      });
    });

  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. GET /appointments (support ?status=)
app.get('/appointments', (req, res) => {
  const { status } = req.query;
  
  let sql = `SELECT * FROM appointments`;
  const params = [];
  
  if (status) {
    sql += ` WHERE status = ?`;
    params.push(status);
  }
  
  sql += ` ORDER BY appointmentAt ASC`;

  db.all(sql, params, (err, rows) => {
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

  const allowedStatuses = ['pending', 'confirmed', 'cancelled'];
  
  if (!status || !allowedStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be pending, confirmed, or cancelled' });
  }

  const sql = `UPDATE appointments SET status = ? WHERE id = ?`;
  db.run(sql, [status, id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    res.status(200).json({ id, status });
  });
});

// 4. DELETE /appointments/:id
app.delete('/appointments/:id', (req, res) => {
  const { id } = req.params;
  const sql = `DELETE FROM appointments WHERE id = ?`;
  db.run(sql, [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    res.status(200).json({ message: 'Appointment deleted successfully', id });
  });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
