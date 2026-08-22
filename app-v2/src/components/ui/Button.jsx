import { forwardRef } from 'react'
import { cn } from './classNames.js'

const TONE_CLASS = {
  primary: 'cb-button-primary',
  secondary: 'cb-button-secondary',
  text: 'cb-button-text',
  danger: 'cb-button-danger',
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
        'cb-button cb-motion-standard inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50',
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
