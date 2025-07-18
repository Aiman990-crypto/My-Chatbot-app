const express = require('express');
const router = express.Router();
const speech = require('@google-cloud/speech');
const fs = require('fs');
const multer = require('multer');
const path = require('path');

const client = new speech.SpeechClient({
  keyFilename: 'credentials/speech-to-text-service.json'
});

const upload = multer({ dest: 'uploads/' });

router.post('/speech-to-text', upload.single('audio'), async (req, res) => {
  try {
    const audioBytes = fs.readFileSync(req.file.path).toString('base64');

    const audio = {
      content: audioBytes,
    };

    const config = {
      encoding: 'WEBM_OPUS',
      sampleRateHertz: 16000,
      languageCode: 'en-US',
    };

    const request = {
      audio: audio,
      config: config,
    };

    const [response] = await client.recognize(request);
    const transcription = response.results.map(result => result.alternatives[0].transcript).join('\n');

    res.json({ text: transcription });
  } catch (err) {
    console.error('Speech-to-Text error:', err);
    res.status(500).send('Error transcribing audio');
  }
});

module.exports = router;
