import React, { memo } from "react";
import { Modal } from "./Modal";

export const CredentialsModal = memo(function CredentialsModal({
    isOpen,
    onClose,
    title = "Credentials",
    successMessage = "Created successfully! Please share these credentials.",
    email,
    password,
}: {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    successMessage?: string;
    email: string;
    password?: string;
}) {
    if (!isOpen) return null;

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="space-y-4">
                <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700">
                    {successMessage}
                </div>
                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Email</label>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 rounded bg-slate-100 px-3 py-2 text-sm text-slate-900 break-all">{email}</code>
                            <button
                                onClick={() => handleCopy(email)}
                                className="p-2 text-slate-400 hover:text-[#0c225e]"
                                title="Copy Email"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Password</label>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 rounded bg-slate-100 px-3 py-2 text-sm text-slate-900 font-mono break-all">
                                {password || "• • • • • • • •"}
                            </code>
                            {password && (
                                <button
                                    onClick={() => handleCopy(password)}
                                    className="p-2 text-slate-400 hover:text-[#0c225e]"
                                    title="Copy Password"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                </button>
                            )}
                        </div>
                        {!password && <p className="text-xs text-slate-500 mt-1">Password was not returned from server.</p>}
                    </div>
                </div>
                <div className="flex justify-end pt-4">
                    <button
                        onClick={onClose}
                        className="rounded-lg bg-[#0c225e] px-4 py-2 text-sm font-bold text-white hover:bg-[#0a1b4d]"
                    >
                        Done
                    </button>
                </div>
            </div>
        </Modal>
    );
});
