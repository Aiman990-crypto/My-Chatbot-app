import React, { useRef, useState } from 'react';

const VoiceRecorder = ({ chatbotReply, setChatbotReply }) => {
  const mediaRecorderRef = useRef(null);
  const recordedChunks = useRef([]);
  const [transcription, setTranscription] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream);

    recordedChunks.current = [];

    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.current.push(event.data);
      }
    };

    mediaRecorderRef.current.onstop = handleRecordingStop;

    mediaRecorderRef.current.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleRecordingStop = async () => {
    const blob = new Blob(recordedChunks.current, { type: 'audio/webm' });

    const formData = new FormData();
    formData.append("audio", blob);

    try {
      const response = await fetch("http://localhost:5000/transcribe", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      console.log("Transcription:", result.transcript);
      setTranscription(result.transcript);

      const chatResponse = await fetch("http://localhost:5000/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: result.transcript,
          userId: "user123"
        })
      });

      const chatData = await chatResponse.json();
      console.log("Chatbot reply:", chatData.response);
      setChatbotReply(chatData.response);

    } catch (error) {
      console.error("Error during transcription or chat:", error);
    }
  };

  return (
    <div className="voice-recorder">
      <h2>🎤 Voice Recorder</h2>
      <button onClick={startRecording} disabled={isRecording}>
        Start Recording
      </button>
      <button onClick={stopRecording} disabled={!isRecording}>
        Stop Recording
      </button>
      
      <p className="transcript">
        <strong>Transcript:</strong> {transcription}
      </p>
    </div>
  );
};

export default VoiceRecorder;
