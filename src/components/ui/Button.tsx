import React, { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
  default: 'bg-primary text-primary-foreground hover:brightness-110 active:brightness-95',
  secondary: 'bg-raised text-foreground border border-border hover:border-border-strong hover:bg-raised/70',
  outline: 'border border-border-strong text-foreground hover:bg-raised',
  ghost: 'text-muted-foreground hover:bg-raised hover:text-foreground',
  destructive: 'bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25',
}

const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-7 px-2.5 text-sm gap-1.5',
  md: 'h-9 px-3.5 text-base gap-2',
  lg: 'h-10 px-5 text-base gap-2',
  icon: 'h-9 w-9',
  'icon-sm': 'h-7 w-7',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, children, variant = 'default', size = 'md', isLoading = false, leftIcon, rightIcon, disabled, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-md font-medium transition-[background-color,border-color,color,filter] duration-150 disabled:pointer-events-none disabled:opacity-45 [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {isLoading ? <Loader2 className="animate-spin" /> : leftIcon}
      {children}
      {!isLoading && rightIcon}
    </button>
  ),
)
Button.displayName = 'Button'
