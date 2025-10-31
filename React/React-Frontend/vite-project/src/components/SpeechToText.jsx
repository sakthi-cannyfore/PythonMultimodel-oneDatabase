import React, { useEffect, useState } from "react";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";

const SpeechToText = () => {
  const [voiceInput, setVoiceInput] = useState("");
  const [responseData, setResponseData] = useState("");
  const { transcript, resetTranscript, browserSupportsSpeechRecognition } =
    useSpeechRecognition();

  const url = "http://localhost:5000/ask";

  useEffect(() => {
    setVoiceInput(transcript);
  }, [transcript]);

  const fetchFunction = async () => {
    if (!voiceInput.trim()) return;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: voiceInput }),
      });
      const data = await res.json();
      setResponseData(data.reply || "No response from backend.");
    } catch (error) {
      console.error("❌ Fetch Error:", error);
      setResponseData("Error contacting server.");
    }
  };

  if (!browserSupportsSpeechRecognition) {
    return <div>Your browser doesn’t support speech recognition.</div>;
  }

  return (
    <div className="flex flex-col items-center p-4 space-y-4">
      <div className="flex items-center space-x-2">
        <input
          type="text"
          placeholder="Ask something..."
          value={voiceInput}
          onChange={(e) => setVoiceInput(e.target.value)}
          className="w-[400px] p-2 border rounded"
        />
        <button
          onClick={SpeechRecognition.startListening}
          className="px-3 py-1 bg-green-700 text-white rounded"
        >
          🎙️ Start
        </button>
        <button
          onClick={SpeechRecognition.stopListening}
          className="px-3 py-1 bg-red-700 text-white rounded"
        >
          🛑 Stop
        </button>
      </div>

      <div className="flex space-x-2">
        <button
          onClick={resetTranscript}
          className="bg-gray-500 px-3 py-1 text-white rounded"
        >
          Reset
        </button>
        <button
          onClick={fetchFunction}
          className="bg-blue-600 px-4 py-2 text-white rounded"
        >
          Send
        </button>
      </div>

      <p className="text-sm text-gray-700">Transcript: {transcript}</p>
      <div className="mt-4 bg-gray-100 p-3 rounded w-[500px] text-left">
        <strong>Response:</strong>
        <p>{responseData}</p>
      </div>
    </div>
  );
};

export default SpeechToText;
