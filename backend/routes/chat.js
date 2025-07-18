const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.post('/', async (req, res) => {
    console.log('Incoming request body:', req.body);
  const chatHistory = req.body.contents;
  const lastMessage = chatHistory?.[chatHistory.length - 1];

  if (!lastMessage || !lastMessage.userId || !lastMessage.content) {
    return res.status(400).json({ error: 'Invalid chat history format' });
  }

  try {
    const savedMessage = await prisma.message.create({
      data: {
        userId: lastMessage.userId,
        role: 'user',
        content: lastMessage.content,
      },
    });

    console.log('Message saved:', savedMessage);
    res.json({ reply: `Echo: ${lastMessage.content}` });
  } catch (err) {
    console.error('DB Error:', err.message);
    res.status(500).json({ error: 'Failed to save message' });
  }
});


router.get('/', async (req, res) => {
  try {
    const messages = await prisma.message.findMany({
      orderBy: { id: 'desc' },
    });

    res.json(messages);
  } catch (err) {
    console.error('Fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

module.exports = router;
