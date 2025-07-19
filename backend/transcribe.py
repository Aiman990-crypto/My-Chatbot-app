# backend/transcribe.py
import os
import whisper
import sys

# Add ffmpeg to PATH
os.environ["PATH"] += os.pathsep + r"C:\Program Files\ffmpeg-7.1.1-essentials_build\bin"

# Load model once
model = whisper.load_model("base")  # options: tiny, base, small, medium, large

def transcribe_audio(audio_path):
    result = model.transcribe(audio_path)
    return result["text"]

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python transcribe.py <audio_path>")
        sys.exit(1)

    audio_path = sys.argv[1]
    print(transcribe_audio(audio_path).encode('utf-8', errors='replace').decode())
