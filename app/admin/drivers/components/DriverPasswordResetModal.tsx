"use client";

import React, { useState, memo } from "react";
import { Driver } from "../../../lib/services/api-client";
import { Modal } from "../../components/ui/Modal";
import { displayDriverEmail } from "../../../lib/utils/driverEmailDisplay";

export const DriverPasswordResetModal = memo(function DriverPasswordResetModal({
    isOpen,
    onClose,
    driver,
    onReset,
}: {
    isOpen: boolean;
    onClose: () => void;
    driver: Driver | null;
    onReset: (password: string) => Promise<void>;
}) {
    const [password, setPassword] = useState("");
    const [isResetting, setIsResetting] = useState(false);

    const generatePassword = () => {
        const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
        let pass = "";
        for (let i = 0; i < 12; i++) {
            pass += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setPassword(pass);
    };

    const handleReset = async () => {
        if (!password || password.length < 8) {
            alert("Password must be at least 8 characters long");
            return;
        }
        setIsResetting(true);
        try {
            await onReset(password);
            setPassword("");
            onClose();
        } catch {
            // Error handled by parent
        } finally {
            setIsResetting(false);
        }
    };

    if (!isOpen || !driver) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Reset Driver Password">
            <div className="space-y-4">
                <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-700">
                    You are resetting the password for <strong>{driver.full_name}</strong> ({displayDriverEmail(driver.email)}).
                </div>
                <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">New Password</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00] outline-none font-mono"
                            placeholder="Enter new password (min 8 characters)"
                            disabled={isResetting}
                        />
                        <button
                            type="button"
                            onClick={generatePassword}
                            className="px-3 py-2 text-xs font-bold text-[#f47f00] border border-[#f47f00] rounded-lg hover:bg-orange-50 disabled:opacity-50"
                            disabled={isResetting}
                        >
                            Generate
                        </button>
                    </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
                        disabled={isResetting}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleReset}
                        className="rounded-lg bg-[#f47f00] px-4 py-2 text-sm font-bold text-white hover:bg-[#d97000] shadow-md shadow-orange-500/10 disabled:opacity-50"
                        disabled={isResetting || !password}
                    >
                        {isResetting ? "Resetting..." : "Reset Password"}
                    </button>
                </div>
            </div>
        </Modal>
    );
});
