const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const speechRoutes = require('./routes/speech');
const geminiRoutes = require('./routes/gemini');
const app = express();


const port = 5000;
require('dotenv').config();
console.log("Using OpenAI key:", process.env.OPENAI_API_KEY);
const multer = require('multer');

const upload = multer({ dest: 'uploads/' });
const { exec } = require('child_process');
const fs = require('fs')

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
const { ChatOpenAI } = require("@langchain/openai");
const { HumanMessage } = require("@langchain/core/messages");



const chatModel = new ChatOpenAI({
  temperature: 0.7,
  modelName: "gpt-3.5-turbo", // or your model
  openAIApiKey: process.env.OPENAI_API_KEY
});

// POST /chat route
app.post('/chat', async (req, res) => {
  const { message, userId } = req.body;

  if (!message || !userId) {
    return res.status(400).json({ error: 'Missing message or userId' });
  }

  try {
    // Send user message to OpenAI
    const result = await chatModel.call([
      new HumanMessage(message)
    ]);

    const botReply = result.text;

    // ✅ Save both messages to the database
    await pool.query(
      'INSERT INTO messages (user_id, content, role) VALUES ($1, $2, $3), ($1, $4, $5)',
      [userId, message, 'user', botReply, 'assistant']
    );

    res.json({ response: botReply });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "Internal chatbot error" });
  }
});



app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
