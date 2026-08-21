import { forwardRef } from 'react'
import { cn } from './classNames.js'

const TONE_CLASS = {
  primary: 'bg-[#8f5168] text-white shadow-[0_12px_28px_rgba(143,81,104,0.24)] hover:bg-[#7c4359]',
  secondary: 'border border-[#dcc2cd] bg-white text-[#6f5462] hover:bg-[#fff5f8]',
  text: 'bg-transparent text-[#6f5462] hover:bg-[#fff5f8]',
  danger: 'bg-[#a3264c] text-white shadow-[0_12px_28px_rgba(163,38,76,0.18)] hover:bg-[#8d2141]',
}

const ButtonBase = forwardRef(function ButtonBase({
  as: Tag = 'button',
  children,
  className,
  loading = false,
  tone = 'primary',
  type = 'button',
  ...props
}, ref) {
  const disabled = props.disabled || loading
  return (
    <Tag
      {...props}
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a05c77] disabled:cursor-not-allowed disabled:opacity-50',
        TONE_CLASS[tone] || TONE_CLASS.primary,
        className,
      )}
      disabled={disabled}
      ref={ref}
      type={Tag === 'button' ? type : undefined}
    >
      {loading ? <span className="size-4 animate-spin rounded-full border-2 border-current/25 border-t-current" aria-hidden="true" /> : null}
      {children}
    </Tag>
  )
})

export const PrimaryButton = forwardRef(function PrimaryButton(props, ref) {
  return <ButtonBase {...props} ref={ref} tone="primary" />
})

export const SecondaryButton = forwardRef(function SecondaryButton(props, ref) {
  return <ButtonBase {...props} ref={ref} tone="secondary" />
})

export const TextButton = forwardRef(function TextButton(props, ref) {
  return <ButtonBase {...props} ref={ref} tone="text" />
})

export const DangerButton = forwardRef(function DangerButton(props, ref) {
  return <ButtonBase {...props} ref={ref} tone="danger" />
})

export function IconButton({ className, label, children, ...props }) {
  return (
    <ButtonBase
      {...props}
      aria-label={label}
      className={cn('min-h-10 min-w-10 rounded-xl px-0', className)}
      tone="secondary"
    >
      {children}
    </ButtonBase>
  )
}
