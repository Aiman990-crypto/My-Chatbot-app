import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { deleteDoc, doc } from 'firebase/firestore';
import VoiceRecorder from './components/VoiceRecorder';
// Import the CSS file
import './App.css';

function App() {
  const [messages, setMessages] = useState([]); // Chat messages
  const [input, setInput] = useState(''); // User's input
  const [loading, setLoading] = useState(false); // AI is generating response
  const [db, setDb] = useState(null); // Firestore
  const [auth, setAuth] = useState(null); // Auth
  const [userId, setUserId] = useState(null); // Current user ID
  const [isAuthReady, setIsAuthReady] = useState(false); // Wait until auth is ready
  const [chatInput, setChatInput] = useState('');
  

  const messagesEndRef = useRef(null);

  // Initialize Firebase once
  useEffect(() => {
    console.log("Attempting to initialize Firebase...");

    const firebaseConfig = {
      apiKey: "AIzaSyBTbyREOz6lNdXhgkZCTFDSAhIUue_yg4U",
      authDomain: "my-chatbot-app-cbc8f.firebaseapp.com",
      projectId: "my-chatbot-app-cbc8f",
      storageBucket: "my-chatbot-app-cbc8f.appspot.com", // ✅ fixed typo here
      messagingSenderId: "76213968406",
      appId: "1:76213968406:web:359187d45be13479ff1f37",
      measurementId: "G-3681H2W371"
    };

    try {
      console.log("Using Firebase Config for initialization:", firebaseConfig);

      const app = initializeApp(firebaseConfig);
      const firestoreDb = getFirestore(app);
      const firebaseAuth = getAuth(app);

      setDb(firestoreDb);
      setAuth(firebaseAuth);

      console.log("Firebase initialized. Setting up auth listener.");

      const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
        if (user) {
          console.log("User signed in:", user.uid);
          setUserId(user.uid);
          setIsAuthReady(true);
        } else {
          console.log("No user signed in. Signing in anonymously.");
          await signInAnonymously(firebaseAuth);
          console.log("Signed in anonymously.");
        }
      });

      return () => unsubscribe();
    } catch (error) {
      console.error("Failed to initialize Firebase:", error);
    }
  }, []);

  // Listen for chat messages
  useEffect(() => {
    if (db && userId && isAuthReady) {
      console.log(`Auth ready and userId available: ${userId}. Setting up Firestore listener.`);

      const chatCollectionPath = `artifacts/default-app-id/users/${userId}/messages`;
      const q = query(collection(db, chatCollectionPath), orderBy('timestamp'));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedMessages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log("Fetched messages from Firestore:", fetchedMessages);
        setMessages(fetchedMessages);
      }, (error) => {
        console.error("Error fetching messages:", error);
      });

      return () => unsubscribe();
    } else {
      console.log("Firestore listener not set up yet. DB:", !!db, "UserID:", !!userId, "AuthReady:", isAuthReady);
    }
  }, [db, userId, isAuthReady]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message to Firestore and call Gemini
  const sendMessage = async () => {
    if (input.trim() === '' || loading || !db || !userId) return;

    const userMessage = {
      text: input,
      sender: 'user',
      timestamp: serverTimestamp(),
    };

    try {
      const chatCollectionPath = `artifacts/default-app-id/users/${userId}/messages`;

      await addDoc(collection(db, chatCollectionPath), userMessage);
      setInput('');
      setLoading(true);

      // Fetch existing messages to send to Gemini
      const q = query(collection(db, chatCollectionPath), orderBy('timestamp'));
      const snapshot = await getDocs(q);
      const currentMessagesForAPI = snapshot.docs.map(doc => doc.data());

      const chatHistory = currentMessagesForAPI.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));

      const apiKey = "AIzaSyAa05mP44on1nhEc6koCjzT7ZxfeOwB1pY"; // Add your Gemini API key here
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
      const payload = {
 
       contents: chatHistory // or [{ parts: [{ text: input }] }] for just the latest
};

const response = await fetch(apiUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)
  
});

const chatHistoryForDB = chatHistory.map((msg) => ({
  userId: userId,
  content: msg.parts?.[0]?.text || '',
  role: msg.role
}));
await fetch('http://localhost:5000/api/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ contents: chatHistoryForDB })
});

      const result = await response.json();
      console.log("Gemini API response:", result);

      if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
        const aiText = result.candidates[0].content.parts[0].text;
        const aiMessage = {
          text: aiText,
          sender: 'model',
          timestamp: serverTimestamp(),
        };
        await addDoc(collection(db, chatCollectionPath), aiMessage);
      } else {
        const fallback = {
          text: "Sorry, I couldn't generate a response. Please try again.",
          sender: 'model',
          timestamp: serverTimestamp(),
        };
        await addDoc(collection(db, chatCollectionPath), fallback);
      }
    } catch (error) {
      console.error("Error sending message or calling Gemini API:", error);
      const errorMsg = {
        text: "An error occurred. Please try again later.",
        sender: 'model',
        timestamp: serverTimestamp(),
      };
      const chatCollectionPath = `artifacts/${typeof __app_id !== 'undefined' ? __app_id : 'default-app-id'}/users/${userId}/messages`;

      await addDoc(collection(db, chatCollectionPath), errorMsg);
    } finally {
      setLoading(false);
    }
  };
const clearChat = async () => {
  if (!db || !userId) {
    console.log("Firestore DB or userId not ready, cannot clear chat.");
    return;
  }

  try {
    const chatCollectionPath = `artifacts/${typeof __app_id !== 'undefined' ? __app_id : 'default-app-id'}/users/${userId}/messages`;
    console.log("Clearing chat at path:", chatCollectionPath);

    const q = collection(db, chatCollectionPath);
    const snapshot = await getDocs(q);

    const deletions = snapshot.docs.map((docSnap) =>
      deleteDoc(doc(db, chatCollectionPath, docSnap.id))
    );

    await Promise.all(deletions);
    console.log("All chat messages deleted!");

    setMessages([]); // clear local state too
  } catch (error) {
    console.error("Error clearing chat:", error);
  }
};




  return (
    <div className="chat-container">
      <header className="chat-header">
        <h1>Gemini Chatbot</h1>
        {userId && <p className="user-id">User ID: <span>{userId}</span></p>}
        
  
      </header>

      <main className="chat-messages">
        {messages.length === 0 && !loading && (
          <div className="message-empty">Start a conversation! Type your message below.</div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.sender}`}>
            <div className="message-bubble">
              <p>{msg.text}</p>
              {msg.timestamp && (
                <span className="message-timestamp">
                  {new Date(msg.timestamp.toDate()).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="loading-indicator">
            <div className="loading-dots">
              <div className="loading-dot"></div>
              <div className="loading-dot"></div>
              <div className="loading-dot"></div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

     <div className="chat-input-area">
  <input
    type="text"
    id="message-input"
    placeholder="Type your message..."
    value={input}
    onChange={(e) => setInput(e.target.value)}
    onKeyPress={(e) => {
      if (e.key === 'Enter') {
        sendMessage();
      }
    }}
    disabled={loading || !isAuthReady}
  />
  <button
    onClick={sendMessage}
    disabled={loading || !isAuthReady || input.trim() === ''}
  >
    Send
  </button>
  <button
    onClick={clearChat}
    className="clear-chat-button"
    disabled={!isAuthReady || loading}
  >
    Clear Chat
  </button>
</div>
<div>
      
      <VoiceRecorder />
    </div>

    </div>
  );
}

export default App;
