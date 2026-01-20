"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/auth-context';
import { UserRole } from '../types/auth-types';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: UserRole[];
    requireCompanyId?: boolean;
    redirectTo?: string;
}

export function ProtectedRoute({
    children,
    allowedRoles,
    requireCompanyId = false,
    redirectTo = '/login',
}: ProtectedRouteProps) {
    const { user, loading, isAuthenticated, hasRole } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // Wait for auth to load
        if (loading) return;

        // Redirect if not authenticated
        if (!isAuthenticated) {
            router.push(redirectTo);
            return;
        }

        // Check role-based access
        if (allowedRoles && !hasRole(allowedRoles)) {
            // Redirect based on user role
            if (user?.role === UserRole.SUPER_ADMIN) {
                router.push('/admin');
            } else if (user?.role === UserRole.COMPANY_ADMIN || user?.role === UserRole.EMPLOYEE) {
                router.push('/company');
            } else {
                router.push('/');
            }
            return;
        }

        // Check company access requirement
        if (requireCompanyId && !user?.company_id) {
            router.push('/');
            return;
        }
    }, [loading, isAuthenticated, user, allowedRoles, requireCompanyId, redirectTo, router, hasRole]);

    // Show loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-surface flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange border-r-transparent"></div>
                    <p className="mt-4 text-sm text-muted">Loading...</p>
                </div>
            </div>
        );
    }

    // Don't render children until auth is verified
    if (!isAuthenticated || (allowedRoles && !hasRole(allowedRoles))) {
        return null;
    }

    return <>{children}</>;
}
