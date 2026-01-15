import { View, Text, type ViewProps, type TextProps } from 'react-native'
import { cn } from '@/lib/utils'

export interface CardProps extends ViewProps {
  className?: string
}

export function Card({ className, ...props }: CardProps) {
  return (
    <View
      className={cn(
        'rounded-lg border border-border bg-card p-4 shadow-sm',
        className
      )}
      {...props}
    />
  )
}

export interface CardHeaderProps extends ViewProps {
  className?: string
}

export function CardHeader({ className, ...props }: CardHeaderProps) {
  return <View className={cn('mb-3', className)} {...props} />
}

export interface CardTitleProps extends TextProps {
  className?: string
}

export function CardTitle({ className, ...props }: CardTitleProps) {
  return (
    <Text
      className={cn('text-lg font-semibold text-card-foreground', className)}
      {...props}
    />
  )
}

export interface CardDescriptionProps extends TextProps {
  className?: string
}

export function CardDescription({ className, ...props }: CardDescriptionProps) {
  return (
    <Text
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

export interface CardContentProps extends ViewProps {
  className?: string
}

export function CardContent({ className, ...props }: CardContentProps) {
  return <View className={cn('', className)} {...props} />
}

export interface CardFooterProps extends ViewProps {
  className?: string
}

export function CardFooter({ className, ...props }: CardFooterProps) {
  return (
    <View className={cn('mt-4 flex flex-row items-center', className)} {...props} />
  )
}
