"use client";

import { useEffect } from "react";

interface ToastProps {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}

export default function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top">
      <div
        className={`px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 ${
          type === "success"
            ? "bg-green-600 text-white"
            : "bg-red-600 text-white"
        }`}
      >
        <span>{message}</span>
        <button
          onClick={onClose}
          className="ml-4 hover:opacity-80"
          aria-label="关闭"
        >
          ×
        </button>
      </div>
    </div>
  );
}

