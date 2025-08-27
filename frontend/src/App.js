import React, { useEffect, useRef, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";

// ✅ Backend URL
const BACKEND_URL = `${process.env.REACT_APP_API_URL}/api/chat`;

export default function App() {
  const [messages, setMessages] = useState([
    { role: "bot", content: "Hello! I'm your AI Chat Assistant 🤖" },
  ]);
  const [input, setInput] = useState("");
  const [theme, setTheme] = useState("neon");
  const [listens, setListens] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
  const [sending, setSending] = useState(false);

  const [image, setImage] = useState(null);
  const fileRef = useRef();
  const msgEndRef = useRef();

  // Auto scroll
  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Browser speech recognition
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  const recognizerRef = useRef(null);

  const startListening = () => {
    if (!SR) return alert("Speech Recognition not supported in this browser.");
    if (recognizerRef.current) return;
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInput((prev) => (prev ? prev + " " + transcript : transcript));
    };
    rec.onend = () => setListens(false);
    rec.onerror = () => setListens(false);
    recognizerRef.current = rec;
    setListens(true);
    rec.start();
  };

  const stopListening = () => {
    recognizerRef.current?.stop();
    recognizerRef.current = null;
    setListens(false);
  };

  // Speech synthesis
  const speak = (text) => {
    if (!("speechSynthesis" in window)) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1;
    utter.pitch = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  };

  const onPickImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const mimeType = file.type;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = String(reader.result).split(",")[1];
      setImage({
        data: base64,
        mimeType,
        name: file.name,
        previewUrl: URL.createObjectURL(file),
      });
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => setImage(null);

  // ✅ Updated sendMessage function
  const sendMessage = async () => {
    if (!input.trim() && !image) return;
    const userMsg = {
      role: "user",
      content: input.trim() || "(sent an image)",
      imageUrl: image?.previewUrl || null,
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setSending(true);

    try {
      const body = { message: userMsg.content };
      if (image)
        body.image = {
          data: image.data,
          mimeType: image.mimeType,
          name: image.name,
        };

      const res = await fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      const botText = data?.reply || "⚠️ No response";
      setMessages((m) => [...m, { role: "bot", content: botText }]);
      if (voiceOn) speak(botText);
    } catch (err) {
      console.error(err);
      setMessages((m) => [
        ...m,
        { role: "bot", content: "⚠️ Failed to reach server." },
      ]);
    } finally {
      setSending(false);
      clearImage();
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className={`app-shell theme-${theme}`}>
      {/* ... rest of your JSX stays the same ... */}
    </div>
  );
}
