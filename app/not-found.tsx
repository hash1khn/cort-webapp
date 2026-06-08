"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NotFound() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-[#080b14] flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background Glows */}
            <div className="absolute top-1/4 -left-20 w-80 h-80 bg-[#fe8503] rounded-full blur-[120px] opacity-10" />
            <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-[#fe8503] rounded-full blur-[120px] opacity-10" />

            <div className="text-center max-w-md mx-auto relative z-10">
                <div className="mb-12 flex justify-center">
                    <img
                        src="/traflinq_dark_no_tagline-Photoroom.png"
                        alt="TrafLinq Logo"
                        className="h-28 w-auto"
                    />
                </div>

                <div className="relative inline-block mb-8">
                    <h1 className="text-[12rem] font-black leading-none tracking-tighter text-white/5 select-none">
                        404
                    </h1>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-px w-24 bg-gradient-to-r from-transparent via-[#fe8503] to-transparent opacity-50" />
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <h2 className="text-4xl font-bold text-white tracking-tight">
                            Lost your way?
                        </h2>
                        <p className="text-white/50 max-w-sm mx-auto text-lg">
                            Sorry, we couldn&apos;t find that page. You&apos;ll find lots to explore on the dashboards.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                        <button
                            onClick={() => router.back()}
                            className="px-8 py-4 rounded-xl border border-white/10 bg-white/5 text-white font-medium hover:bg-white/10 hover:border-white/20 transition-all duration-300 backdrop-blur-sm"
                        >
                            Go Back
                        </button>
                        <Link
                            href="/"
                            className="px-8 py-4 rounded-xl bg-[#fe8503] text-white font-bold hover:bg-[#e67702] transition-all duration-300 shadow-[0_0_20px_rgba(254,133,3,0.3)] hover:shadow-[0_0_30px_rgba(254,133,3,0.5)] transform hover:-translate-y-0.5 active:translate-y-0"
                        >
                            Back to Home
                        </Link>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-8 text-xs text-white/20 font-medium tracking-widest uppercase">
                &copy; {new Date().getFullYear()} TrafLinq Corporate Transportation
            </div>
        </div>
    );
}
