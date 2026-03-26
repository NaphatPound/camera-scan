"use client";

import { ScanLine, ImagePlus, Loader2, PackagePlus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatMessage } from "@/types";

interface ScanAddStockProps {
  messages: ChatMessage[];
  onImageUpload: (file: File) => void;
  isLoading: boolean;
}

export default function ScanAddStock({
  messages,
  onImageUpload,
  isLoading,
}: ScanAddStockProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageUpload(file);
      e.target.value = "";
    }
  };

  const scanMessages = messages.filter(
    (m) =>
      m.image ||
      m.content.includes("Scanning image") ||
      m.content.includes("Detected:") ||
      m.content.includes("Added") ||
      m.content.includes("cancelled") ||
      m.content.includes("Could not analyze")
  );

  return (
    <div className="flex flex-col h-full bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-5 py-4 border-b border-border">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <PackagePlus className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground">Scan & Add to Stock</h2>
          <p className="text-xs text-muted">Upload item photos to add to inventory</p>
        </div>
      </div>

      {/* Upload Area */}
      <div className="shrink-0 px-5 py-4">
        {isLoading ? (
          <div className="w-full flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="text-sm font-medium text-primary">Analyzing item...</span>
          </div>
        ) : (
          <label className="w-full flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all cursor-pointer active:scale-[0.98]">
            <input
              type="file"
              onChange={handleFileChange}
              accept="image/*"
              className="sr-only"
            />
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <ScanLine className="w-7 h-7 text-primary" />
            </div>
            <div className="text-center">
              <span className="text-sm font-medium text-primary block">Scan Item Photo</span>
              <span className="text-xs text-muted">Take or upload a photo to detect & count items</span>
            </div>
          </label>
        )}
      </div>

      {/* Scan History */}
      <div className="flex-1 overflow-y-auto px-5 pb-4 min-h-0">
        <p className="text-xs font-medium text-muted mb-3 flex items-center gap-1.5">
          <ImagePlus className="w-3.5 h-3.5" />
          Recent Scans
        </p>
        {scanMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted text-xs gap-2">
            <ScanLine className="w-8 h-8 opacity-20" />
            <p>No scans yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {scanMessages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className={`rounded-xl px-3 py-2.5 text-sm ${
                    msg.role === "user"
                      ? "bg-primary/5 border border-primary/10"
                      : msg.role === "system"
                      ? "bg-accent/5 border border-accent/15"
                      : "bg-background border border-border"
                  }`}
                >
                  {msg.image && (
                    <img
                      src={msg.image}
                      alt="Scanned"
                      className="rounded-lg mb-2 max-h-32 w-full object-cover"
                    />
                  )}
                  <p className="text-xs whitespace-pre-wrap">{msg.content}</p>
                  <p className="text-[10px] text-muted mt-1">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
