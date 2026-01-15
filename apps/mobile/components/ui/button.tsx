import { Pressable, Text, type PressableProps } from 'react-native'
import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'

const buttonVariants = cva(
  'flex flex-row items-center justify-center rounded-lg',
  {
    variants: {
      variant: {
        default: 'bg-primary',
        secondary: 'bg-secondary',
        destructive: 'bg-destructive',
        outline: 'border border-border bg-transparent',
        ghost: 'bg-transparent',
      },
      size: {
        default: 'h-12 px-4',
        sm: 'h-10 px-3',
        lg: 'h-14 px-6',
        icon: 'h-12 w-12',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

const buttonTextVariants = cva('font-medium', {
  variants: {
    variant: {
      default: 'text-primary-foreground',
      secondary: 'text-secondary-foreground',
      destructive: 'text-destructive-foreground',
      outline: 'text-foreground',
      ghost: 'text-foreground',
    },
    size: {
      default: 'text-base',
      sm: 'text-sm',
      lg: 'text-lg',
      icon: 'text-base',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
})

export interface ButtonProps
  extends PressableProps,
    VariantProps<typeof buttonVariants> {
  children: React.ReactNode
  className?: string
  textClassName?: string
}

export function Button({
  children,
  className,
  textClassName,
  variant,
  size,
  ...props
}: ButtonProps) {
  return (
    <Pressable
      className={cn(
        buttonVariants({ variant, size }),
        'active:opacity-80',
        className
      )}
      {...props}
    >
      {typeof children === 'string' ? (
        <Text className={cn(buttonTextVariants({ variant, size }), textClassName)}>
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  )
}
