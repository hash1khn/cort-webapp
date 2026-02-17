import React from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
    if (totalPages <= 1) return null;

    // Helper to calculate page range with ellipses
    const getPageRange = () => {
        const delta = 1; // Number of neighbors to show around current page
        const range = [];
        const rangeWithDots = [];
        let l;

        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
                range.push(i);
            }
        }

        for (const i of range) {
            if (l) {
                if (i - l === 2) {
                    rangeWithDots.push(l + 1);
                } else if (i - l !== 1) {
                    rangeWithDots.push('...');
                }
            }
            rangeWithDots.push(i);
            l = i;
        }

        return rangeWithDots;
    };

    const displayPages = getPageRange();

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-5 px-2">
            {/* Page Info */}
            <div className="text-sm font-medium text-slate-500 order-2 sm:order-1">
                Showing page <span className="font-bold text-navy">{currentPage}</span> of{' '}
                <span className="font-bold text-navy">{totalPages}</span>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1 order-1 sm:order-2 bg-white/50 p-1 rounded-full border border-slate-100/50 shadow-sm">
                <button
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-full text-slate-400 hover:text-navy hover:bg-white transition-all disabled:opacity-30 disabled:hover:bg-transparent"
                    aria-label="Previous Page"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="hidden sm:flex items-center gap-1 px-2">
                    {displayPages.map((page, idx) => {
                        if (page === '...') {
                            return (
                                <span key={`ellipsis-${idx}`} className="w-8 h-8 flex items-center justify-center text-slate-300">
                                    <MoreHorizontal className="w-4 h-4" />
                                </span>
                            );
                        }

                        const isCurrent = currentPage === page;
                        return (
                            <button
                                key={page}
                                onClick={() => onPageChange(page as number)}
                                className={`
                                    w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold transition-all
                                    ${isCurrent
                                        ? 'bg-navy text-white shadow-md shadow-navy/20 scale-105'
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-navy'
                                    }
                                `}
                            >
                                {page}
                            </button>
                        );
                    })}
                </div>

                {/* Mobile simplified view */}
                <div className="flex sm:hidden items-center px-4 font-bold text-sm text-navy">
                    {currentPage} / {totalPages}
                </div>

                <button
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-full text-slate-400 hover:text-navy hover:bg-white transition-all disabled:opacity-30 disabled:hover:bg-transparent"
                    aria-label="Next Page"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
