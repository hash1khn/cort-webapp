"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../services/api-client';
import {
    AuthContextType,
    AuthUser,
    AuthSession,
    UserRole,
    PermissionKey,
    CrudAction,
} from '../types/auth-types';
import { staffHasCrud } from '../utils/staff-permissions';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [session, setSession] = useState<AuthSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    /**
     * Load user profile from backend using stored token
     */
    const loadUserProfile = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            if (!apiClient.isAuthenticated()) {
                setUser(null);
                setSession(null);
                setLoading(false);
                return;
            }

            const response = await apiClient.getProfile();
            setUser(response.data);
        } catch (err) {
            console.error('Failed to load user profile:', err);
            setError(err instanceof Error ? err.message : 'Failed to load profile');
            // Clear invalid token
            await apiClient.logout();
            setUser(null);
            setSession(null);
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Initialize auth state on mount
     */
    useEffect(() => {
        loadUserProfile();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run once on mount

    /**
     * Login user with email and password
     */
    const login = useCallback(async (email: string, password: string) => {
        try {
            setLoading(true);
            setError(null);

            const response = await apiClient.login({ email, password });

            setUser(response.data.user);
            setSession(response.data.session);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Login failed';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Logout user
     */
    const logout = useCallback(async () => {
        try {
            setLoading(true);
            await apiClient.logout();
            setUser(null);
            setSession(null);
            setError(null);
            router.push('/');
        } catch (err) {
            console.error('Logout error:', err);
        } finally {
            setLoading(false);
        }
    }, [router]);

    /**
     * Refresh user profile
     */
    const refreshProfile = useCallback(async () => {
        await loadUserProfile();
    }, [loadUserProfile]);

    /**
     * Check if user is authenticated
     */
    const isAuthenticated = !!user && !!apiClient.isAuthenticated();

    /**
     * Check if user is super admin
     */
    const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;

    /**
     * Check if user is internal staff
     */
    const isInternalStaff = user?.role === UserRole.INTERNAL_STAFF;

    /**
     * Check if user is company admin
     */
    const isCompanyAdmin = user?.role === UserRole.COMPANY_ADMIN;

    /**
     * Check if user is employee
     */
    const isEmployee = user?.role === UserRole.EMPLOYEE;

    /**
     * Check if user is driver
     */
    const isDriver = user?.role === UserRole.DRIVER;

    /**
     * Check if user has any of the specified roles
     */
    const hasRole = useCallback((roles: UserRole[]): boolean => {
        if (!user) return false;
        return roles.includes(user.role);
    }, [user]);

    /**
     * Check if user has access to a specific company
     * Super admins have access to all companies
     * Other users only have access to their own company
     */
    const hasCompanyAccess = useCallback((companyId: number): boolean => {
        if (!user) return false;
        if (user.role === UserRole.SUPER_ADMIN) return true;
        return user.company_id === companyId;
    }, [user]);

    const hasCrud = useCallback((key: PermissionKey, action: CrudAction): boolean => {
        if (!user) return false;
        if (user.role === UserRole.SUPER_ADMIN) return true;
        if (user.role === UserRole.INTERNAL_STAFF) {
            return staffHasCrud(user.permissions ?? null, key, action);
        }
        return false;
    }, [user]);

    /** Nav / default route gate: requires `read` on the section for INTERNAL_STAFF. */
    const hasPermission = useCallback(
        (key: PermissionKey): boolean => hasCrud(key, 'read'),
        [hasCrud],
    );

    /**
     * Check if shuttle service is enabled for the user's company
     */
    const isShuttleEnabled = !!user && (user.role === UserRole.SUPER_ADMIN || user.enabled_services?.shuttle === true);

    /**
     * Check if chauffeur service is enabled for the user's company
     */
    const isChauffeurEnabled = !!user && (user.role === UserRole.SUPER_ADMIN || user.enabled_services?.chauffeur === true);

    const value: AuthContextType = {
        user,
        session,
        loading,
        error,
        login,
        logout,
        refreshProfile,
        isAuthenticated,
        isSuperAdmin,
        isInternalStaff,
        isCompanyAdmin,
        isEmployee,
        isDriver,
        hasRole,
        hasCompanyAccess,
        hasPermission,
        hasCrud,
        isShuttleEnabled,
        isChauffeurEnabled,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use auth context
 */
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
