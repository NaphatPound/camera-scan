"use client";

import { useState, useRef, useEffect } from "react";
import {
  ChefHat,
  Camera,
  Send,
  Loader2,
  Check,
  X,
  UtensilsCrossed,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { RecipeResult, RecipeIngredient } from "@/types";
import { compressImage } from "@/lib/compressImage";

interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
  image?: string;
  recipe?: RecipeResult;
}

export default function RecipeFinder() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMsg = (role: ChatMsg["role"], content: string, image?: string, recipe?: RecipeResult) => {
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role, content, image, recipe },
    ]);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isLoading) return;
    e.target.value = "";

    setIsLoading(true);
    try {
      const base64 = await compressImage(file);
      addMsg("user", "Analyzing food image...", base64);

      const res = await fetch("/api/recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64 }),
      });
      const data = await res.json();

      if (data.error) {
        addMsg("assistant", `Could not analyze: ${data.error}`);
      } else {
        const recipe: RecipeResult = {
          dishName: data.dishName,
          ingredients: data.ingredients,
          instructions: data.instructions,
        };
        const desc = data.description ? `${data.description}\n\n` : "";
        const stockInfo = `${data.inStockCount}/${data.totalIngredients} ingredients available in store`;
        addMsg("assistant", `${desc}**${data.dishName}** - ${stockInfo}`, undefined, recipe);
      }
    } catch (error) {
      addMsg("assistant", `Error: ${String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setInput("");
    addMsg("user", text);
    setIsLoading(true);

    try {
      const res = await fetch("/api/recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text }),
      });
      const data = await res.json();

      if (data.error) {
        addMsg("assistant", `Error: ${data.error}`);
      } else {
        addMsg("assistant", data.reply || "No response.");
      }
    } catch (error) {
      addMsg("assistant", `Error: ${String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-5 py-4 border-b border-border">
        <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center">
          <ChefHat className="w-5 h-5 text-rose-500" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground">Recipe Finder</h2>
          <p className="text-xs text-muted">Upload food photo or ask about recipes</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted gap-3">
            <UtensilsCrossed className="w-10 h-10 opacity-20" />
            <p className="text-xs text-center">
              Upload a food photo to find ingredients<br />
              or ask about any recipe
            </p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[90%] rounded-2xl px-3 py-2.5 ${
                  msg.role === "user"
                    ? "bg-rose-500 text-white rounded-br-md"
                    : "bg-background border border-border rounded-bl-md"
                }`}
              >
                {msg.image && (
                  <img src={msg.image} alt="Food" className="rounded-lg mb-2 max-h-40 w-full object-cover" />
                )}
                <p className="text-xs whitespace-pre-wrap">{msg.content}</p>

                {/* Recipe Card */}
                {msg.recipe && (
                  <div className="mt-3 space-y-2">
                    {/* Ingredients */}
                    <div className="bg-surface rounded-lg p-2.5 border border-border">
                      <p className="text-[10px] font-bold text-muted uppercase tracking-wide mb-1.5">
                        Ingredients
                      </p>
                      <div className="space-y-1">
                        {msg.recipe.ingredients.map((ing: RecipeIngredient, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            {ing.inStock ? (
                              <span className="w-4 h-4 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                                <Check className="w-2.5 h-2.5 text-accent" />
                              </span>
                            ) : (
                              <span className="w-4 h-4 rounded-full bg-danger/10 flex items-center justify-center shrink-0">
                                <X className="w-2.5 h-2.5 text-danger" />
                              </span>
                            )}
                            <span className={ing.inStock ? "text-foreground" : "text-muted"}>
                              {ing.name}
                            </span>
                            <span className="text-muted text-[10px] ml-auto">{ing.amount}</span>
                            {ing.inStock && ing.stockCount ? (
                              <span className="text-[9px] bg-accent/10 text-accent px-1.5 py-0.5 rounded">
                                {ing.stockCount} in stock
                              </span>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Instructions */}
                    {msg.recipe.instructions && (
                      <div className="bg-surface rounded-lg p-2.5 border border-border">
                        <p className="text-[10px] font-bold text-muted uppercase tracking-wide mb-1.5">
                          How to Cook
                        </p>
                        <p className="text-xs text-foreground whitespace-pre-wrap">
                          {msg.recipe.instructions}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-background border border-border rounded-2xl rounded-bl-md px-3 py-2.5">
              <div className="flex items-center gap-2 text-muted text-xs">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Analyzing...
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 px-4 py-3 border-t border-border">
        <div className="flex items-center gap-2">
          <label className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/5 cursor-pointer active:scale-95 transition-all">
            <input
              type="file"
              onChange={handleImageUpload}
              accept="image/*"
              disabled={isLoading}
              className="sr-only"
            />
            <Camera className="w-5 h-5" />
          </label>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask about a recipe..."
            disabled={isLoading}
            className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 disabled:opacity-50 placeholder:text-muted"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-2 rounded-xl bg-rose-500 text-white hover:bg-rose-600 transition-colors disabled:opacity-50 active:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
