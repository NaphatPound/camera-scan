"use client";

import { useState } from "react";
import {
  Search,
  ScanSearch,
  Loader2,
  X,
  Package,
  ImagePlus,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SearchResult } from "@/types";
import { compressImage } from "@/lib/compressImage";

interface SearchProductProps {
  onImageSearch: (file: File) => Promise<void>;
  searchResults: SearchResult[] | null;
  searchIdentified: string;
  isSearching: boolean;
  onClearSearch: () => void;
  onAddReferenceImage: (itemId: string, image: string) => void;
}

export default function SearchProduct({
  onImageSearch,
  searchResults,
  searchIdentified,
  isSearching,
  onClearSearch,
  onAddReferenceImage,
}: SearchProductProps) {
  const [searchPreview, setSearchPreview] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [addingRefFor, setAddingRefFor] = useState<string | null>(null);

  const handleSearchFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file);
        setSearchPreview(compressed);
      } catch {
        // fallback preview
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

  return (
    <div className="flex flex-col h-full bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-5 py-4 border-b border-border">
        <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
          <ScanSearch className="w-5 h-5 text-orange-500" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground">Search Product</h2>
          <p className="text-xs text-muted">Upload a photo to find items in store</p>
        </div>
      </div>

      {/* Upload Search Area */}
      <div className="shrink-0 px-5 py-4">
        {isSearching ? (
          <div className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed border-orange-500/30 bg-orange-500/5">
            {searchPreview && (
              <img
                src={searchPreview}
                alt="Searching"
                className="w-20 h-20 rounded-xl object-cover border border-border"
              />
            )}
            <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
            <span className="text-sm font-medium text-orange-500">Identifying item...</span>
          </div>
        ) : searchResults ? (
          <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-3">
            <div className="flex items-start gap-3">
              {searchPreview && (
                <img
                  src={searchPreview}
                  alt="Searched"
                  className="w-16 h-16 rounded-lg object-cover border border-border shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted">AI Identified</p>
                <p className="font-semibold text-sm capitalize text-foreground truncate">
                  &quot;{searchIdentified}&quot;
                </p>
                <p className="text-xs text-muted mt-0.5">
                  {searchResults.length} match{searchResults.length !== 1 ? "es" : ""} in store
                </p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <label className="p-2 rounded-lg text-orange-500 hover:bg-orange-500/10 transition-colors cursor-pointer active:scale-95">
                  <input
                    type="file"
                    onChange={handleSearchFile}
                    accept="image/*"
                    className="sr-only"
                  />
                  <Search className="w-4 h-4" />
                </label>
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-2 rounded-lg text-muted hover:text-danger hover:bg-danger/5 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <label className="w-full flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10 hover:border-orange-500/50 transition-all cursor-pointer active:scale-[0.98]">
            <input
              type="file"
              onChange={handleSearchFile}
              accept="image/*"
              className="sr-only"
            />
            <div className="w-14 h-14 rounded-full bg-orange-500/10 flex items-center justify-center">
              <Search className="w-7 h-7 text-orange-500" />
            </div>
            <div className="text-center">
              <span className="text-sm font-medium text-orange-500 block">Search by Image</span>
              <span className="text-xs text-muted">Upload a product photo to find it in your store</span>
            </div>
          </label>
        )}
      </div>

      {/* Search Results List */}
      <div className="flex-1 overflow-y-auto px-5 pb-4 min-h-0">
        {searchResults && searchResults.length > 0 ? (
          <>
            <p className="text-xs font-medium text-muted mb-3">Search Results</p>
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
                          <img
                            src={item.imagePreview}
                            alt={item.name}
                            className="w-12 h-12 rounded-lg object-cover border border-border"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-primary/5 flex items-center justify-center">
                            <Package className="w-5 h-5 text-primary/40" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm capitalize truncate">{item.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted">
                              In stock: <b className="text-foreground">{item.count}</b>
                            </span>
                            {item.referenceImages && item.referenceImages.length > 0 && (
                              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                {item.referenceImages.length} ref
                              </span>
                            )}
                          </div>
                        </div>
                        <div
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            result.matchScore >= 80
                              ? "bg-accent/10 text-accent"
                              : result.matchScore >= 50
                              ? "bg-orange-500/10 text-orange-500"
                              : "bg-muted/10 text-muted"
                          }`}
                        >
                          {result.matchScore}%
                        </div>
                        <button
                          type="button"
                          onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                          className="p-1.5 rounded-lg text-muted hover:text-orange-500 hover:bg-orange-500/5 transition-all"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
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
                                <label
                                  className="flex items-center gap-1 text-[11px] text-orange-500 hover:text-orange-600 transition-colors cursor-pointer"
                                  onClick={() => setAddingRefFor(item.id)}
                                >
                                  <input
                                    type="file"
                                    onChange={handleRefImageFile}
                                    accept="image/*"
                                    className="sr-only"
                                  />
                                  <ImagePlus className="w-3.5 h-3.5" />
                                  Add
                                </label>
                              </div>
                              {item.referenceImages && item.referenceImages.length > 0 ? (
                                <div className="flex gap-2 flex-wrap">
                                  {item.referenceImages.map((img, idx) => (
                                    <img
                                      key={idx}
                                      src={img}
                                      alt={`${item.name} ref ${idx + 1}`}
                                      className="w-14 h-14 rounded-lg object-cover border border-border"
                                    />
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-muted/60 italic">No reference images yet.</p>
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
          <div className="flex flex-col items-center justify-center py-8 text-muted text-sm gap-2">
            <Search className="w-10 h-10 opacity-20" />
            <p>No matching items in store</p>
            <p className="text-xs">This item may not be in your inventory yet.</p>
          </div>
        ) : !isSearching ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted text-xs gap-2">
            <ScanSearch className="w-8 h-8 opacity-20" />
            <p>Upload an image to search</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
