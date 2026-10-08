import { z } from 'zod'

// Validation messages are i18n keys; forms translate them when rendering.

export const WINE_TYPES = ['RED', 'WHITE', 'ROSE', 'SPARKLING', 'DESSERT', 'FORTIFIED'] as const
export type WineTypeCode = (typeof WINE_TYPES)[number]

export const wineSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2, 'moments.validation.nameRequired').max(120),
  producer: z.string().max(120).optional(),
  vintage: z
    .number()
    .int()
    .min(1800)
    .max(new Date().getFullYear() + 1)
    .optional(),
  region: z.string().max(120).optional(),
  country: z.string().max(120).optional(),
  type: z.enum(WINE_TYPES).optional(),
})
export type WineInput = z.infer<typeof wineSchema>

export const photoInputSchema = z.object({
  uri: z.string().min(1),
  isCover: z.boolean(),
})
export type PhotoInput = z.infer<typeof photoInputSchema>

export const momentFormSchema = z.object({
  title: z.string().min(2, 'moments.validation.titleRequired').max(80),
  description: z.string().max(500).optional(),
  happenedAt: z.string().min(1, 'moments.validation.dateRequired'),
  locationName: z.string().min(2, 'moments.validation.locationRequired'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  wineIds: z.array(z.string().uuid()).min(1, 'moments.validation.wineRequired').max(8),
  rating: z.number().int().min(1).max(5).optional(),
  photos: z.array(photoInputSchema).max(3),
})

export type MomentFormValues = z.infer<typeof momentFormSchema>
