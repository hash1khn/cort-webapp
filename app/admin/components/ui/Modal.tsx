import React, { memo } from "react";

export const Modal = memo(function Modal({
    isOpen,
    onClose,
    title,
    children,
    size = "md",
}: {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    size?: "sm" | "md" | "lg" | "xl";
}) {
    if (!isOpen) return null;

    const sizeClass =
        size === "sm"
            ? "max-w-md"
            : size === "lg"
              ? "max-w-2xl"
              : size === "xl"
                ? "max-w-4xl"
                : "max-w-lg";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
            <div className={`relative w-full ${sizeClass} rounded-xl bg-white shadow-2xl ring-1 ring-slate-200 animate-in fade-in zoom-in duration-200 my-auto`}>
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 sticky top-0 bg-white rounded-t-xl z-10">
                    <h3 className="text-lg font-bold text-[#0c225e]">{title}</h3>
                    <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100 text-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <div className="p-6 max-h-[80vh] overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
});
