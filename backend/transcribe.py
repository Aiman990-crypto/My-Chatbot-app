# backend/transcribe.py
import os
os.environ["PATH"] += os.pathsep + r"C:\Program Files\ffmpeg-7.1.1-essentials_build\bin"
import whisper
import sys

model = whisper.load_model("base")  # options: tiny, base, small, medium, large

def transcribe_audio(audio_path):
    result = model.transcribe(audio_path)
    print(result["text"])  # Output for debugging
    return result["text"]

if __name__ == "__main__":
    audio_path = sys.argv[1]
    print(transcribe_audio(audio_path))
