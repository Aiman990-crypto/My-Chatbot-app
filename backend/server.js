const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const speechRoutes = require('./routes/speech');
const geminiRoutes = require('./routes/gemini');
const app = express();


const port = 5000;
require('dotenv').config();
const multer = require('multer');

const upload = multer({ dest: 'uploads/' });
const { exec } = require('child_process');
const fs = require('fs');

// PostgreSQL connection pool
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'chatbotdb',
  password: 'Anna1234',
  port: 5432,
});

app.use(cors());
app.use(express.json());
app.use('/api', speechRoutes);
app.use('/api', geminiRoutes);
// POST route to save messages
app.post('/api/messages', async (req, res) => {
  const { contents } = req.body;

  if (!contents || !Array.isArray(contents)) {
    return res.status(400).json({ success: false, message: 'Invalid or missing contents.' });
  }

  try {
    for (const msg of contents) {
      const { userId, content, role } = msg;
      if (userId && content && role) {
        await pool.query(
          'INSERT INTO messages (user_id, content, role) VALUES ($1, $2, $3)',
          [userId, content, role]
        );
      }
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error inserting messages:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});



app.post('/transcribe', upload.single('audio'), (req, res) => {
  const audioPath = req.file.path;

  const command = `python transcribe.py ${audioPath}`;
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error('Error:', error.message);
      return res.status(500).send('Transcription error');
    }
    if (stderr) console.error('stderr:', stderr);

    res.send({ transcript: stdout.trim() });
  });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
