"use client";

import { useState, useRef, useEffect } from "react";
import { Send, ImagePlus, Loader2, Camera } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatMessage } from "@/types";

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  onImageUpload: (file: File) => void;
  isLoading: boolean;
}

export default function ChatInterface({
  messages,
  onSendMessage,
  onImageUpload,
  isLoading,
}: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageUpload(file);
      e.target.value = "";
    }
  };

  const handleSendClick = () => {
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput("");
  };

  return (
    <div className="flex flex-col h-full bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-5 py-4 border-b border-border">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Camera className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground">Chat Assistant</h2>
          <p className="text-xs text-muted">Ask about inventory management</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-muted text-sm">
            Start a conversation or upload an image to scan inventory items.
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-primary text-white rounded-br-md"
                    : msg.role === "system"
                    ? "bg-accent/10 text-accent border border-accent/20 rounded-bl-md"
                    : "bg-background border border-border rounded-bl-md"
                }`}
              >
                {msg.image && (
                  <img
                    src={msg.image}
                    alt="Uploaded"
                    className="rounded-lg mb-2 max-h-48 object-cover"
                  />
                )}
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <p
                  className={`text-[10px] mt-1 ${
                    msg.role === "user" ? "text-white/60" : "text-muted"
                  }`}
                >
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-background border border-border rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2 text-muted text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 px-4 py-3 border-t border-border">
        <div className="flex items-center gap-2">
          <label className="p-2.5 rounded-xl text-muted hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer active:scale-95">
            <input
              type="file"
              onChange={handleFileChange}
              accept="image/*"
              disabled={isLoading}
              className="sr-only"
            />
            <ImagePlus className="w-5 h-5" />
          </label>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendClick();
              }
            }}
            placeholder="Type a message..."
            disabled={isLoading}
            className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-50 placeholder:text-muted"
          />
          <button
            type="button"
            onClick={handleSendClick}
            disabled={!input.trim() || isLoading}
            className="p-2.5 rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
