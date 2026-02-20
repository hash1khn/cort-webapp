import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import type { CompanyRootState, CompanyDispatch } from './company-store';

export const useCompanyDispatch = () => useDispatch<CompanyDispatch>();
export const useCompanySelector: TypedUseSelectorHook<CompanyRootState> = useSelector;
