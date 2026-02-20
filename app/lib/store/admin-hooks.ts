import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import type { AdminRootState, AdminDispatch } from './admin-store';

export const useAdminDispatch = () => useDispatch<AdminDispatch>();
export const useAdminSelector: TypedUseSelectorHook<AdminRootState> = useSelector;
