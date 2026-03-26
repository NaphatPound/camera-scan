"use client";

import { useState, useCallback, useEffect } from "react";
import { PackagePlus, ScanSearch, Package, MessageSquare } from "lucide-react";
import ChatInterface from "@/components/ChatInterface";
import StockDashboard from "@/components/StockDashboard";
import ScanAddStock from "@/components/ScanAddStock";
import SearchProduct from "@/components/SearchProduct";
import ApprovalModal from "@/components/ApprovalModal";
import { ChatMessage, StockItem, ApprovalData, SearchResult } from "@/types";
import { compressImage } from "@/lib/compressImage";

type MobileTab = "scan" | "chat" | "search" | "stock";

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [approvalData, setApprovalData] = useState<ApprovalData | null>(null);
  const [currentImagePreview, setCurrentImagePreview] = useState<string>("");
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [searchIdentified, setSearchIdentified] = useState<string>("");
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<MobileTab>("scan");

  // Load stock on mount
  useEffect(() => {
    fetch("/api/stock")
      .then((res) => res.json())
      .then((data) => {
        if (data.items) setStockItems(data.items);
      })
      .catch(console.error);
  }, []);

  const addMessage = useCallback(
    (role: ChatMessage["role"], content: string, image?: string) => {
      const msg: ChatMessage = {
        id: crypto.randomUUID(),
        role,
        content,
        image,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, msg]);
      return msg;
    },
    []
  );

  // ========== CHAT ==========
  const handleSendMessage = useCallback(
    async (content: string) => {
      addMessage("user", content);
      setIsLoading(true);

      try {
        const chatHistory = [
          ...messages.filter((m) => m.role !== "system").map((m) => ({
            role: m.role,
            content: m.content,
          })),
          { role: "user", content },
        ];

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: chatHistory }),
        });

        const data = await response.json();
        if (data.error) {
          addMessage("assistant", `Error: ${data.error}`);
        } else {
          addMessage("assistant", data.content);
        }
      } catch (error) {
        addMessage("assistant", `Connection error: ${String(error)}`);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, addMessage]
  );

  // Helper: upload base64 image to server, returns URL path
  const uploadImage = useCallback(async (base64: string, prefix: string): Promise<string> => {
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64, prefix }),
    });
    const data = await res.json();
    return data.url || base64; // fallback to base64 if upload fails
  }, []);

  // ========== SCAN & ADD TO STOCK ==========
  const handleScanImage = useCallback(
    async (file: File) => {
      setIsLoading(true);

      try {
        const base64 = await compressImage(file);
        // Save to file
        const imageUrl = await uploadImage(base64, "scan");
        setCurrentImagePreview(imageUrl);
        addMessage("user", `Scanning image: ${file.name}`, imageUrl);

        const response = await fetch("/api/vision", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64 }),
        });

        const data = await response.json();

        if (data.error) {
          addMessage(
            "assistant",
            `Could not analyze image: ${data.error}${data.raw ? `\nRaw response: ${data.raw}` : ""}`
          );
        } else {
          addMessage(
            "assistant",
            `Detected: ${data.count}x ${data.item}\nPlease review and approve to add to stock.`
          );
          setApprovalData({
            visionResult: { item: data.item, count: data.count },
            imagePreview: imageUrl,
          });
        }
      } catch (error) {
        addMessage("assistant", `Vision analysis error: ${String(error)}`);
      } finally {
        setIsLoading(false);
      }
    },
    [addMessage, uploadImage]
  );

  const handleApprove = useCallback(
    async (itemName: string, count: number) => {
      try {
        const response = await fetch("/api/stock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: itemName,
            count,
            imagePreview: currentImagePreview,
            addReferenceImage: currentImagePreview,
          }),
        });

        const data = await response.json();
        if (data.items) setStockItems(data.items);
        addMessage("system", `Added ${count}x ${itemName} to the store stock.`);
      } catch (error) {
        addMessage("system", `Failed to add to stock: ${String(error)}`);
      }

      setApprovalData(null);
      setCurrentImagePreview("");
    },
    [addMessage, currentImagePreview]
  );

  const handleCancelApproval = useCallback(() => {
    addMessage("system", "Stock addition cancelled.");
    setApprovalData(null);
    setCurrentImagePreview("");
  }, [addMessage]);

  // ========== SEARCH PRODUCT ==========
  const handleImageSearch = useCallback(
    async (file: File) => {
      setIsSearching(true);
      setSearchResults(null);

      try {
        const base64 = await compressImage(file);

        const response = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64 }),
        });

        const data = await response.json();
        if (data.error) {
          addMessage("assistant", `Search failed: ${data.error}`);
          setSearchResults(null);
        } else {
          setSearchIdentified(data.identified);
          setSearchResults(data.results || []);
          addMessage(
            "system",
            `Image search: identified "${data.identified}" (${data.confidence}% confidence). ${data.totalMatches} match(es) found in stock.`
          );
        }
      } catch (error) {
        addMessage("assistant", `Search error: ${String(error)}`);
      } finally {
        setIsSearching(false);
      }
    },
    [addMessage]
  );

  const handleClearSearch = useCallback(() => {
    setSearchResults(null);
    setSearchIdentified("");
  }, []);

  // ========== REFERENCE IMAGES ==========
  const handleAddReferenceImage = useCallback(
    async (itemId: string, image: string) => {
      try {
        // Upload image to file first
        const imageUrl = await uploadImage(image, "ref");
        const response = await fetch("/api/stock", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: itemId, referenceImage: imageUrl }),
        });
        const data = await response.json();
        if (data.items) setStockItems(data.items);
      } catch (error) {
        console.error("Failed to add reference image:", error);
      }
    },
    []
  );

  // ========== STOCK ==========
  const handleRemoveItem = useCallback(async (id: string) => {
    try {
      const response = await fetch("/api/stock", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await response.json();
      if (data.items) setStockItems(data.items);
    } catch (error) {
      console.error("Failed to remove item:", error);
    }
  }, []);

  const tabs: { key: MobileTab; label: string; icon: React.ReactNode }[] = [
    { key: "scan", label: "Scan & Add", icon: <PackagePlus className="w-4 h-4" /> },
    { key: "chat", label: "Chat", icon: <MessageSquare className="w-4 h-4" /> },
    { key: "search", label: "Search", icon: <ScanSearch className="w-4 h-4" /> },
    { key: "stock", label: "Stock", icon: <Package className="w-4 h-4" /> },
  ];

  return (
    <main className="fixed inset-0 flex flex-col overflow-hidden">
      {/* Mobile Tab Bar */}
      <div className="lg:hidden flex shrink-0 border-b border-border bg-surface z-10">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-3 text-[11px] font-medium transition-colors ${
              activeTab === tab.key
                ? "text-primary border-b-2 border-primary bg-primary/5"
                : "text-muted active:bg-background"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Desktop: 4-column layout */}
      <div className="hidden lg:flex flex-1 gap-3 p-3 overflow-hidden">
        <div className="w-[25%] h-full">
          <ScanAddStock
            messages={messages}
            onImageUpload={handleScanImage}
            isLoading={isLoading}
          />
        </div>
        <div className="w-[25%] h-full">
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            onImageUpload={handleScanImage}
            isLoading={isLoading}
          />
        </div>
        <div className="w-[25%] h-full">
          <SearchProduct
            onImageSearch={handleImageSearch}
            searchResults={searchResults}
            searchIdentified={searchIdentified}
            isSearching={isSearching}
            onClearSearch={handleClearSearch}
            onAddReferenceImage={handleAddReferenceImage}
          />
        </div>
        <div className="w-[25%] h-full">
          <StockDashboard
            items={stockItems}
            onRemoveItem={handleRemoveItem}
            onAddReferenceImage={handleAddReferenceImage}
          />
        </div>
      </div>

      {/* Mobile: Tab Content */}
      <div className="flex-1 lg:hidden p-3 overflow-hidden">
        <div className={`h-full ${activeTab === "scan" ? "" : "hidden"}`}>
          <ScanAddStock
            messages={messages}
            onImageUpload={handleScanImage}
            isLoading={isLoading}
          />
        </div>
        <div className={`h-full ${activeTab === "chat" ? "" : "hidden"}`}>
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            onImageUpload={handleScanImage}
            isLoading={isLoading}
          />
        </div>
        <div className={`h-full ${activeTab === "search" ? "" : "hidden"}`}>
          <SearchProduct
            onImageSearch={handleImageSearch}
            searchResults={searchResults}
            searchIdentified={searchIdentified}
            isSearching={isSearching}
            onClearSearch={handleClearSearch}
            onAddReferenceImage={handleAddReferenceImage}
          />
        </div>
        <div className={`h-full ${activeTab === "stock" ? "" : "hidden"}`}>
          <StockDashboard
            items={stockItems}
            onRemoveItem={handleRemoveItem}
            onAddReferenceImage={handleAddReferenceImage}
          />
        </div>
      </div>

      {/* Approval Modal */}
      <ApprovalModal
        data={approvalData}
        onApprove={handleApprove}
        onCancel={handleCancelApproval}
      />
    </main>
  );
}
