import React, { useEffect, useRef, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";

// ✅ Automatically switch between local and deployed backend
const BACKEND_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:5000/api/chat"
    : "/api/chat";

export default function App() {
  const [messages, setMessages] = useState([
    { role: "bot", content: "Hello! I'm your AI Chat Assistant 🤖" },
  ]);
  const [input, setInput] = useState("");
  const [theme, setTheme] = useState("neon"); // 'neon' | 'dark'
  const [listens, setListens] = useState(false); // mic on/off
  const [voiceOn, setVoiceOn] = useState(false); // speak bot replies
  const [sending, setSending] = useState(false);

  const [image, setImage] = useState(null); // { data, mimeType, name, previewUrl }
  const fileRef = useRef();
  const msgEndRef = useRef();

  // Auto scroll
  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Browser speech recognition (mic)
  const SR =
    window.SpeechRecognition || window.webkitSpeechRecognition || null;
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

  // Speech synthesis (speak bot)
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
      <div className="container py-4">
        {/* Header / Controls */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h1 className="app-title text-center">
            <span className="glow-emoji">🤖</span> AI Chat Assistant
          </h1>

          <div className="d-flex gap-2 flex-wrap">
            {/* Theme toggle */}
            <div className="btn-group">
              <button
                className={`btn btn-sm ${
                  theme === "neon" ? "btn-info" : "btn-outline-info"
                }`}
                onClick={() => setTheme("neon")}
              >
                Neon
              </button>
              <button
                className={`btn btn-sm ${
                  theme === "dark" ? "btn-secondary" : "btn-outline-secondary"
                }`}
                onClick={() => setTheme("dark")}
              >
                Dark
              </button>
            </div>

            {/* Voice toggle */}
            <div className="form-check form-switch ms-2">
              <input
                className="form-check-input"
                type="checkbox"
                id="voiceSwitch"
                checked={voiceOn}
                onChange={(e) => setVoiceOn(e.target.checked)}
              />
              <label className="form-check-label text-nowrap" htmlFor="voiceSwitch">
                Voice reply
              </label>
            </div>
          </div>
        </div>

        {/* Chat card */}
        <div className="chat-card shadow-lg p-3 p-md-4">
          {/* Messages */}
          <div className="messages-box mb-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`message ${m.role === "user" ? "user-message" : "bot-message"}`}
              >
                {m.imageUrl && (
                  <div className="mb-2">
                    <img
                      src={m.imageUrl}
                      alt="uploaded"
                      className="img-fluid rounded"
                    />
                  </div>
                )}
                {m.content}
              </div>
            ))}
            <div ref={msgEndRef} />
          </div>

          {/* Composer */}
          <div className="composer">
            {image && (
              <div className="d-flex align-items-center gap-2 mb-2">
                <img
                  src={image.previewUrl}
                  alt="preview"
                  className="rounded"
                  style={{ height: 48, width: 48, objectFit: "cover" }}
                />
                <div className="text-truncate small">{image.name}</div>
                <button
                  className="btn btn-sm btn-outline-danger ms-auto"
                  onClick={clearImage}
                >
                  Remove
                </button>
              </div>
            )}

            <div className="d-flex gap-2">
              <div className="flex-grow-1">
                <textarea
                  className="form-control input-field"
                  rows={1}
                  placeholder="Type your message… (Enter to send)"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                />
              </div>

              {/* Upload */}
              <label className="btn btn-outline-light px-3 d-flex align-items-center">
                🖼️
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={onPickImage}
                />
              </label>

              {/* Mic */}
              {!listens ? (
                <button
                  className="btn btn-outline-light px-3"
                  onClick={startListening}
                  title="Start mic"
                >
                  🎤
                </button>
              ) : (
                <button
                  className="btn btn-danger px-3"
                  onClick={stopListening}
                  title="Stop mic"
                >
                  ⏹
                </button>
              )}

              {/* Send */}
              <button className="btn send-btn px-4" disabled={sending} onClick={sendMessage}>
                {sending ? "Sending…" : "Send"}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-3 small opacity-75">
          🦋 “You’re not alone — this AI’s always by your side.”
        </div>
      </div>
    </div>
  );
}
