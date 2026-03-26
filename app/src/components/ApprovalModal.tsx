"use client";

import { useState } from "react";
import { Check, X, Edit3, Package } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ApprovalData } from "@/types";

interface ApprovalModalProps {
  data: ApprovalData | null;
  onApprove: (itemName: string, count: number) => void;
  onCancel: () => void;
}

export default function ApprovalModal({ data, onApprove, onCancel }: ApprovalModalProps) {
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCount, setEditCount] = useState(0);

  if (!data) return null;

  const handleEdit = () => {
    setEditName(data.visionResult.item);
    setEditCount(data.visionResult.count);
    setEditMode(true);
  };

  const handleApprove = () => {
    if (editMode) {
      onApprove(editName, editCount);
    } else {
      onApprove(data.visionResult.item, data.visionResult.count);
    }
  };

  const itemName = editMode ? editName : data.visionResult.item;
  const itemCount = editMode ? editCount : data.visionResult.count;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-surface rounded-2xl border border-border shadow-2xl p-6 w-full max-w-md mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Package className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-foreground">Confirm Stock Addition</h3>
              <p className="text-sm text-muted">Review detected items before adding</p>
            </div>
          </div>

          {/* Image Preview */}
          {data.imagePreview && (
            <img
              src={data.imagePreview}
              alt="Scanned"
              className="w-full h-40 object-cover rounded-xl mb-4 border border-border"
            />
          )}

          {/* Details */}
          <div className="bg-background rounded-xl p-4 mb-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">Item Name</span>
              {editMode ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="text-sm font-medium bg-surface border border-border rounded-lg px-3 py-1.5 text-right focus:outline-none focus:ring-2 focus:ring-primary/30 w-40"
                />
              ) : (
                <span className="text-sm font-medium capitalize">{itemName}</span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">Quantity</span>
              {editMode ? (
                <input
                  type="number"
                  value={editCount}
                  onChange={(e) => setEditCount(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  className="text-sm font-medium bg-surface border border-border rounded-lg px-3 py-1.5 text-right focus:outline-none focus:ring-2 focus:ring-primary/30 w-20"
                />
              ) : (
                <span className="text-sm font-bold text-primary">{itemCount}</span>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted hover:bg-background transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            {!editMode && (
              <button
                onClick={handleEdit}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-secondary hover:bg-background transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                Edit
              </button>
            )}
            <button
              onClick={handleApprove}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
            >
              <Check className="w-4 h-4" />
              Approve
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
