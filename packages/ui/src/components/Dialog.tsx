import * as React from "react";
import { X } from "lucide-react";
import { cn } from "../utils";

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const Dialog: React.FC<DialogProps> = ({ isOpen, onClose, title, children, className }) => {
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop Overlay */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className={cn(
        "relative w-full max-w-md transform rounded-xl bg-zinc-900 border border-zinc-800 p-6 text-left align-middle shadow-2xl transition-all z-10 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150",
        className
      )}>
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h3 className="text-lg font-bold text-zinc-100">
            {title}
          </h3>
          <button 
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-450 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
          >
            {React.createElement(X, { size: 18 })}
          </button>
        </div>
        
        <div className="flex flex-col gap-4 text-sm text-zinc-300">
          {children}
        </div>
      </div>
    </div>
  );
};
