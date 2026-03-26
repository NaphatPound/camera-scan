"use client";

import { useState, useRef, useEffect } from "react";
import {
  Search,
  ScanSearch,
  Loader2,
  X,
  Package,
  ImagePlus,
  ChevronDown,
  ChevronUp,
  Send,
  Camera,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SearchResult } from "@/types";
import { compressImage } from "@/lib/compressImage";

interface SearchMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  image?: string;
}

interface SearchProductProps {
  onImageSearch: (file: File) => Promise<void>;
  searchResults: SearchResult[] | null;
  searchIdentified: string;
  isSearching: boolean;
  onClearSearch: () => void;
  onAddReferenceImage: (itemId: string, image: string) => void;
  onTextSearch: (query: string) => Promise<void>;
  textSearchReply: string;
}

export default function SearchProduct({
  onImageSearch,
  searchResults,
  searchIdentified,
  isSearching,
  onClearSearch,
  onAddReferenceImage,
  onTextSearch,
  textSearchReply,
}: SearchProductProps) {
  const [searchPreview, setSearchPreview] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [addingRefFor, setAddingRefFor] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<SearchMessage[]>([]);
  const [isChatting, setIsChatting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // When textSearchReply updates, add it to chat
  useEffect(() => {
    if (textSearchReply) {
      setChatMessages((prev) => {
        // Avoid duplicate
        if (prev.length > 0 && prev[prev.length - 1].content === textSearchReply) return prev;
        return [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", content: textSearchReply },
        ];
      });
      setIsChatting(false);
    }
  }, [textSearchReply]);

  const handleSearchFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file);
        setSearchPreview(compressed);
      } catch {
        // fallback
      }
      onImageSearch(file);
      e.target.value = "";
    }
  };

  const handleRefImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && addingRefFor) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        onAddReferenceImage(addingRefFor, base64);
        setAddingRefFor(null);
      };
      reader.readAsDataURL(file);
      e.target.value = "";
    }
  };

  const handleClear = () => {
    setSearchPreview(null);
    setExpandedItem(null);
    onClearSearch();
  };

  const handleChatSend = async () => {
    const text = chatInput.trim();
    if (!text || isChatting) return;

    setChatMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: text },
    ]);
    setChatInput("");
    setIsChatting(true);

    await onTextSearch(text);
  };

  return (
    <div className="flex flex-col h-full bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-5 py-4 border-b border-border">
        <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
          <ScanSearch className="w-5 h-5 text-orange-500" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground">Search Product</h2>
          <p className="text-xs text-muted">Chat or upload photo to find items</p>
        </div>
      </div>

      {/* Image Search Area - compact */}
      <div className="shrink-0 px-4 py-3 border-b border-border">
        {isSearching ? (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-500/5 border border-orange-500/20">
            {searchPreview && (
              <img src={searchPreview} alt="Searching" className="w-10 h-10 rounded-lg object-cover border border-border" />
            )}
            <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
            <span className="text-xs font-medium text-orange-500">Identifying...</span>
          </div>
        ) : searchResults ? (
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-orange-500/5 border border-orange-500/20">
            {searchPreview && (
              <img src={searchPreview} alt="Searched" className="w-10 h-10 rounded-lg object-cover border border-border shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-xs capitalize truncate">&quot;{searchIdentified}&quot;</p>
              <p className="text-[10px] text-muted">{searchResults.length} match{searchResults.length !== 1 ? "es" : ""}</p>
            </div>
            <label className="p-1.5 rounded-lg text-orange-500 hover:bg-orange-500/10 cursor-pointer">
              <input type="file" onChange={handleSearchFile} accept="image/*" className="sr-only" />
              <Camera className="w-3.5 h-3.5" />
            </label>
            <button type="button" onClick={handleClear} className="p-1.5 rounded-lg text-muted hover:text-danger">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <label className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10 cursor-pointer transition-all active:scale-[0.98]">
            <input type="file" onChange={handleSearchFile} accept="image/*" className="sr-only" />
            <div className="w-9 h-9 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
              <Camera className="w-4 h-4 text-orange-500" />
            </div>
            <div>
              <span className="text-xs font-medium text-orange-500 block">Search by Image</span>
              <span className="text-[10px] text-muted">Upload a photo to find products</span>
            </div>
          </label>
        )}
      </div>

      {/* Chat + Results Area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0 space-y-3">
        {/* Chat Messages */}
        {chatMessages.length > 0 && (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {chatMessages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs ${
                      msg.role === "user"
                        ? "bg-orange-500 text-white rounded-br-md"
                        : "bg-background border border-border rounded-bl-md"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {isChatting && (
              <div className="flex justify-start">
                <div className="bg-background border border-border rounded-2xl rounded-bl-md px-3 py-2">
                  <Loader2 className="w-3.5 h-3.5 text-muted animate-spin" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}

        {/* Search Results */}
        {searchResults && searchResults.length > 0 ? (
          <>
            <p className="text-xs font-medium text-muted">Search Results</p>
            <div className="space-y-2">
              <AnimatePresence>
                {searchResults.map((result) => {
                  const item = result.item;
                  const isExpanded = expandedItem === item.id;

                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="rounded-xl bg-background border border-border hover:border-orange-500/20 transition-colors"
                    >
                      <div className="flex items-center gap-3 p-3">
                        {item.imagePreview ? (
                          <img src={item.imagePreview} alt={item.name} className="w-10 h-10 rounded-lg object-cover border border-border" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center">
                            <Package className="w-4 h-4 text-primary/40" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs capitalize truncate">{item.name}</p>
                          <span className="text-[10px] text-muted">Stock: <b className="text-foreground">{item.count}</b></span>
                        </div>
                        <div
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            result.matchScore >= 80 ? "bg-accent/10 text-accent"
                              : result.matchScore >= 50 ? "bg-orange-500/10 text-orange-500"
                              : "bg-muted/10 text-muted"
                          }`}
                        >
                          {result.matchScore}%
                        </div>
                        <button
                          type="button"
                          onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                          className="p-1 rounded-lg text-muted hover:text-orange-500"
                        >
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="px-3 pb-3 overflow-hidden"
                          >
                            <div className="border-t border-border pt-2">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-[10px] font-medium text-muted">Reference Images</p>
                                <label
                                  className="flex items-center gap-1 text-[10px] text-orange-500 cursor-pointer"
                                  onClick={() => setAddingRefFor(item.id)}
                                >
                                  <input type="file" onChange={handleRefImageFile} accept="image/*" className="sr-only" />
                                  <ImagePlus className="w-3 h-3" />
                                  Add
                                </label>
                              </div>
                              {item.referenceImages && item.referenceImages.length > 0 ? (
                                <div className="flex gap-1.5 flex-wrap">
                                  {item.referenceImages.map((img, idx) => (
                                    <img key={idx} src={img} alt={`ref ${idx + 1}`} className="w-12 h-12 rounded-lg object-cover border border-border" />
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[10px] text-muted/60 italic">No reference images.</p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </>
        ) : searchResults && searchResults.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-muted text-xs gap-1.5">
            <Search className="w-8 h-8 opacity-20" />
            <p>No matching items in store</p>
          </div>
        ) : chatMessages.length === 0 && !isSearching ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted text-xs gap-2">
            <ScanSearch className="w-8 h-8 opacity-20" />
            <p>Ask about products or upload an image</p>
          </div>
        ) : null}
      </div>

      {/* Chat Input */}
      <div className="shrink-0 px-4 py-3 border-t border-border">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleChatSend();
              }
            }}
            placeholder="Ask about a product..."
            disabled={isChatting || isSearching}
            className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 disabled:opacity-50 placeholder:text-muted"
          />
          <button
            type="button"
            onClick={handleChatSend}
            disabled={!chatInput.trim() || isChatting || isSearching}
            className="p-2 rounded-xl bg-orange-500 text-white hover:bg-orange-600 transition-colors disabled:opacity-50 active:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
