import React from 'react'
import { cn } from '@/lib/utils'

const statusConfig = {
  // Projects
  aktiv:     { label: 'Aktiv',     className: 'bg-emerald-100 text-emerald-700' },
  planlagt:  { label: 'Planlagt',  className: 'bg-blue-100 text-blue-700' },
  pause:     { label: 'På pause',  className: 'bg-amber-100 text-amber-700' },
  fullfort:  { label: 'Fullført',  className: 'bg-slate-100 text-slate-600' },
  avbrutt:   { label: 'Avbrutt',   className: 'bg-red-100 text-red-700' },
  // Deviations
  åpen:              { label: 'Åpen',            className: 'bg-red-100 text-red-700' },
  under_behandling:  { label: 'Under behandling',className: 'bg-amber-100 text-amber-700' },
  lukket:            { label: 'Lukket',          className: 'bg-slate-100 text-slate-600' },
  // Checklists
  ikke_startet: { label: 'Ikke startet', className: 'bg-slate-100 text-slate-600' },
  påbegynt:     { label: 'Påbegynt',     className: 'bg-blue-100 text-blue-700' },
}

export function StatusBadge({ status }) {
  const config = statusConfig[status] || { label: status, className: 'bg-slate-100 text-slate-600' }
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', config.className)}>
      {config.label}
    </span>
  )
}

export function PageHeader({ title, subtitle, onAdd, addLabel, actions }) {
  return (
    <div className="bg-white border-b border-slate-200">
      <div className="px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            {subtitle && <p className="text-slate-500 mt-1 text-sm">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-3">
            {actions}
            {onAdd && (
              <button
                onClick={onAdd}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors"
              >
                <span>+</span> {addLabel || 'Ny'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
        {Icon && <Icon className="h-8 w-8 text-slate-400" />}
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-500 text-sm mb-6 max-w-sm">{description}</p>
      {onAction && (
        <button
          onClick={onAction}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}

export function Modal({ open, onClose, title, children, size = 'md' }) {
  if (!open) return null
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={cn('relative bg-white rounded-2xl shadow-xl w-full flex flex-col max-h-[90vh]', sizes[size])}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors text-xl leading-none">×</button>
        </div>
        <div className="overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}

export function Input({ label, error, className, ...props }) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>}
      <input
        className={cn(
          'w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-all',
          error && 'border-red-300 focus:ring-red-500',
          className
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

export function Select({ label, value, onChange, options, placeholder, className }) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-white transition-all',
          className
        )}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}

export function Textarea({ label, error, className, ...props }) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>}
      <textarea
        className={cn(
          'w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-all resize-none',
          error && 'border-red-300',
          className
        )}
        {...props}
      />
    </div>
  )
}

export function Button({ children, variant = 'primary', size = 'md', className, disabled, ...props }) {
  const variants = {
    primary: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    outline: 'border border-slate-200 hover:bg-slate-50 text-slate-700',
    ghost:   'hover:bg-slate-100 text-slate-700',
    danger:  'bg-red-600 hover:bg-red-700 text-white',
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }
  return (
    <button
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-2 font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function Card({ children, className, ...props }) {
  return (
    <div className={cn('bg-white rounded-2xl border border-slate-100 shadow-sm', className)} {...props}>
      {children}
    </div>
  )
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin" />
    </div>
  )
}
