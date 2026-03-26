"use client";

import { useState } from "react";
import {
  Package,
  Trash2,
  BarChart3,
  ImagePlus,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { StockItem } from "@/types";

interface StockDashboardProps {
  items: StockItem[];
  onRemoveItem: (id: string) => void;
  onAddReferenceImage: (itemId: string, image: string) => void;
}

export default function StockDashboard({
  items,
  onRemoveItem,
  onAddReferenceImage,
}: StockDashboardProps) {
  const totalItems = items.reduce((sum, item) => sum + item.count, 0);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const handleRefImageForItem = (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        onAddReferenceImage(itemId, base64);
      };
      reader.readAsDataURL(file);
      e.target.value = "";
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
            <Package className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Store Stock</h2>
            <p className="text-xs text-muted">
              {items.length} categories, {totalItems} total items
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-accent/10 text-accent px-3 py-1.5 rounded-full text-xs font-medium">
          <BarChart3 className="w-3.5 h-3.5" />
          {totalItems}
        </div>
      </div>

      {/* Stock List */}
      <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted text-sm gap-3">
            <Package className="w-12 h-12 opacity-30" />
            <p>No items in stock yet.</p>
            <p className="text-xs">Use Scan & Add to add items.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {items.map((item) => {
                const isExpanded = expandedItem === item.id;

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="rounded-xl bg-background border border-border hover:border-primary/20 transition-colors group"
                  >
                    <div className="flex items-center gap-3 p-3">
                      {item.imagePreview ? (
                        <img
                          src={item.imagePreview}
                          alt={item.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center">
                          <Package className="w-5 h-5 text-primary/40" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm capitalize truncate">{item.name}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted">
                            Added {new Date(item.addedAt).toLocaleDateString()}
                          </p>
                          {item.referenceImages && item.referenceImages.length > 0 && (
                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                              {item.referenceImages.length} ref img
                            </span>
                          )}
                        </div>
                      </div>

                      <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold">
                        x{item.count}
                      </span>

                      <button
                        type="button"
                        onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                        className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-primary/5 transition-all"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.id)}
                        className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger/5 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
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
                          <div className="border-t border-border pt-3">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-medium text-muted">Reference Images</p>
                              <label className="flex items-center gap-1 text-[11px] text-primary hover:text-primary-hover transition-colors cursor-pointer">
                                <input
                                  type="file"
                                  onChange={(e) => handleRefImageForItem(item.id, e)}
                                  accept="image/*"
                                  className="sr-only"
                                />
                                <ImagePlus className="w-3.5 h-3.5" />
                                Add Image
                              </label>
                            </div>

                            {item.referenceImages && item.referenceImages.length > 0 ? (
                              <div className="flex gap-2 flex-wrap">
                                {item.referenceImages.map((img, idx) => (
                                  <img
                                    key={idx}
                                    src={img}
                                    alt={`${item.name} ref ${idx + 1}`}
                                    className="w-16 h-16 rounded-lg object-cover border border-border"
                                  />
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-muted/60 italic">
                                No reference images yet. Add one to improve search accuracy.
                              </p>
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
        )}
      </div>
    </div>
  );
}
