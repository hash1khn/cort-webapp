"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NotFound() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-[#F3F4F6] flex flex-col items-center justify-center p-4">
            <div className="text-center max-w-md mx-auto">
                <div className="mb-8 flex justify-center">
                    <img
                        src="/logo.svg"
                        alt="Cort Logo"
                        className="h-16 w-auto"
                    />
                </div>

                <h1 className="text-9xl font-black text-[#0c225e] mb-4 opacity-10">404</h1>

                <div className="-mt-16 relative z-10">
                    <h2 className="text-3xl md:text-4xl font-bold text-[#0c225e] mb-2">
                        Lost your way?
                    </h2>
                    <p className="text-gray-500 mb-8 max-w-sm mx-auto">
                        Sorry, we couldn&apos;t find that page. You&apos;ll find lots to explore on the home page.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button
                            onClick={() => router.back()}
                            className="px-6 py-3 rounded-lg border border-[#0c225e] text-[#0c225e] font-semibold hover:bg-gray-50 transition-colors"
                        >
                            Go Back
                        </button>
                        <Link
                            href="/"
                            className="px-6 py-3 rounded-lg bg-[#f47f00] text-white font-semibold hover:bg-[#d67000] transition-colors shadow-md hover:shadow-lg"
                        >
                            Back to Home
                        </Link>
                    </div>
                </div>
            </div>

            <div className="mt-16 text-xs text-gray-400">
                &copy; {new Date().getFullYear()} Cort Corporate Transportation
            </div>
        </div>
    );
}
