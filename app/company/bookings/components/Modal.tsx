"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
    const [isMounted, setIsMounted] = useState(isOpen);
    const [isClosing, setIsClosing] = useState(false);

    // Handle mount/unmount with close animation
    useEffect(() => {
        if (isOpen) {
            setIsMounted(true);
            setIsClosing(false);
            return;
        }

        if (isMounted) {
            setIsClosing(true);
            const timeout = setTimeout(() => {
                setIsMounted(false);
                setIsClosing(false);
            }, 380); // match CSS animation duration
            return () => clearTimeout(timeout);
        }
    }, [isOpen, isMounted]);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [isOpen, onClose]);

    if (!isMounted) return null;

    return createPortal(
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 modal-overlay ${isClosing ? "modal-overlay-closing" : ""}`}>
            <div className={`w-full max-w-2xl transform overflow-hidden rounded-[2.5rem] bg-[var(--bg-card)] shadow-2xl transition-all max-h-[90vh] flex flex-col ring-1 ring-white/[0.07] modal-panel ${isClosing ? "modal-panel-closing" : ""}`}>
                <div className="flex items-center justify-between border-b border-[var(--border-input)] px-8 py-6 bg-[var(--bg-card)] shrink-0">
                    <h3 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]">{title}</h3>
                    <button
                        onClick={onClose}
                        className="rounded-xl p-2.5 text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-all hover:rotate-90 border border-transparent hover:border-[var(--border-input)]"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-8 bg-[var(--bg-page)]">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
}
