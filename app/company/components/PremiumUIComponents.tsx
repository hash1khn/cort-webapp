'use client';

import React from 'react';

// ============================================
// REUSABLE PREMIUM UI COMPONENTS
// For Company Dashboard Premium Design
// ============================================

// --- CARD COMPONENT ---
export const PremiumCard = ({ 
  children, 
  className = "", 
  withLeftBorder = false,
  hover = true 
}: { 
  children: React.ReactNode
  className?: string
  withLeftBorder?: boolean
  hover?: boolean
}) => (
  <div 
    className={`
      bg-white border border-[var(--border-light)] rounded-[2rem] p-6
      shadow-[0_2px_8px_rgba(0,0,0,0.08)]
      transition-all duration-200
      ${withLeftBorder ? 'border-l-4 border-l-[var(--cort-navy)]' : ''}
      ${hover ? 'hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] hover:-translate-y-0.5' : ''}
      ${className}
    `}
  >
    {children}
  </div>
);

// --- TYPOGRAPHY COMPONENTS ---
export const PageTitle = ({ children }: { children: React.ReactNode }) => (
  <h1 className="text-4xl font-black tracking-tight text-[var(--cort-navy)]">
    {children}
  </h1>
);

export const SectionTitle = ({ 
  children, 
  icon 
}: { 
  children: React.ReactNode
  icon?: React.ReactNode 
}) => (
  <h2 className="text-lg font-bold text-[var(--cort-navy)] mb-4 flex items-center gap-2">
    {icon && <span className="text-[var(--cort-orange)]">{icon}</span>}
    {children}
  </h2>
);

export const MetricLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
    {children}
  </div>
);

export const MetricValue = ({ children }: { children: React.ReactNode }) => (
  <div className="text-4xl font-black tracking-tight text-[var(--cort-navy)]">
    {children}
  </div>
);

export const HelperText = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <p className={`text-sm text-[var(--text-secondary)] mt-2 ${className}`}>
    {children}
  </p>
);

// --- BUTTON COMPONENTS ---
export const ButtonPrimary = ({ 
  children, 
  onClick, 
  disabled = false 
}: { 
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="px-6 py-3 rounded-[8px] font-bold text-white text-sm bg-[var(--cort-orange)] shadow-md transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
  >
    {children}
  </button>
);

export const ButtonSecondary = ({ 
  children, 
  onClick, 
  disabled = false 
}: { 
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="px-6 py-3 rounded-[8px] font-bold text-sm border-2 border-[var(--cort-navy)] text-[var(--cort-navy)] bg-white transition-all duration-200 hover:bg-[var(--surface-subtle)] active:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
  >
    {children}
  </button>
);

export const ButtonTertiary = ({ 
  children, 
  onClick 
}: { 
  children: React.ReactNode
  onClick?: () => void
}) => (
  <button
    onClick={onClick}
    className="px-4 py-2 rounded-[6px] font-semibold text-xs text-[var(--text-secondary)] bg-[var(--surface-muted)] transition-all duration-200 hover:bg-[var(--border-light)] hover:text-[var(--cort-navy)]"
  >
    {children}
  </button>
);

// --- STATUS BADGE COMPONENT ---
export const StatusBadge = ({ 
  status, 
  variant = 'default' 
}: { 
  status: string
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
}) => {
  const variants: Record<string, string> = {
    default: 'bg-[var(--surface-muted)] text-[var(--text-secondary)]',
    success: 'bg-green-50 text-[var(--accent-success)]',
    warning: 'bg-yellow-50 text-[var(--accent-warning)]',
    danger: 'bg-red-50 text-[var(--accent-danger)]',
    info: 'bg-blue-50 text-[#3b82f6]',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold ${variants[variant] || variants['default']} border border-current border-opacity-20`}>
      {status}
    </span>
  );
};

// --- KPI CARD COMPONENT ---
export const KPICard = ({
  label,
  value,
  unit = 'PKR',
  trend,
  icon,
  withLeftBorder = true
}: {
  label: string
  value: number | string
  unit?: string
  trend?: { value: string; direction: 'up' | 'down' | 'neutral' }
  icon?: React.ReactNode
  withLeftBorder?: boolean
}) => (
  <PremiumCard withLeftBorder={withLeftBorder}>
    <div className="flex items-start justify-between mb-3">
      <MetricLabel>{label}</MetricLabel>
      {icon && <span className="text-[var(--cort-orange)]">{icon}</span>}
    </div>
    
    <div className="flex items-baseline gap-2">
      <MetricValue>{value}</MetricValue>
      {unit && <span className="text-sm text-[var(--text-muted)]">{unit}</span>}
    </div>
    
    {trend && (
      <div className="mt-3 flex items-center gap-1">
        <StatusBadge 
          status={trend.value}
          variant={trend.direction === 'up' ? 'danger' : trend.direction === 'down' ? 'success' : 'default'}
        />
      </div>
    )}
  </PremiumCard>
);

// --- WELCOME BANNER ---
export const WelcomeBanner = ({
  userName,
  date,
  upcomingBookings,
  onNewBooking
}: {
  userName: string
  date: Date
  upcomingBookings: number
  onNewBooking: () => void
}) => {
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <PremiumCard className="bg-[var(--cort-navy)] text-white border-0">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-white opacity-70 mb-2">
            {formattedDate}
          </div>
          <PageTitle>
            <span className="text-white">Welcome back, </span>
            <span className="text-[var(--cort-orange)]">{userName}</span>
          </PageTitle>
          <HelperText className="text-white text-opacity-80 mt-3">
            You have <span className="font-bold">{upcomingBookings}</span> upcoming bookings.
          </HelperText>
        </div>
        
        <ButtonPrimary onClick={onNewBooking}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          New Booking
        </ButtonPrimary>
      </div>
    </PremiumCard>
  );
};

// --- PROGRESS BAR ---
export const ProgressBar = ({
  label,
  value,
  max = 100,
  unit = '%'
}: {
  label: string
  value: number
  max?: number
  unit?: string
}) => {
  const percentage = (value / max) * 100;
  const isWarning = percentage > 90;

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <MetricLabel>{label}</MetricLabel>
        <span className="font-bold text-sm text-[var(--cort-navy)]">
          {percentage.toFixed(0)}{unit}
        </span>
      </div>
      <div className="w-full h-3 bg-[var(--surface-muted)] rounded-full overflow-hidden border border-[var(--border-light)]">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isWarning 
              ? 'bg-[var(--accent-danger)]' 
              : 'bg-[var(--cort-navy)]'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
};

// --- METRIC COMPARISON ---
export const MetricComparison = ({
  leftLabel,
  leftValue,
  rightLabel,
  rightValue,
  unit = 'PKR'
}: {
  leftLabel: string
  leftValue: number | string
  rightLabel: string
  rightValue: number | string
  unit?: string
}) => (
  <div className="grid grid-cols-2 gap-6">
    <div>
      <MetricLabel>{leftLabel}</MetricLabel>
      <MetricValue>{leftValue}</MetricValue>
      <HelperText>{unit}</HelperText>
    </div>
    <div>
      <MetricLabel>{rightLabel}</MetricLabel>
      <MetricValue>{rightValue}</MetricValue>
      <HelperText>{unit}</HelperText>
    </div>
  </div>
);
