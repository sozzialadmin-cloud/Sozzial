import { z } from 'zod'

export const createPlanSchema = z.object({
  spot_id: z.string().uuid('Choose a pizza spot.'),
  title: z.string().trim().min(3, 'Add a short plan title.').max(120, 'Title is too long.'),
  max_people: z.coerce.number().int().min(2).max(20),
  quick_note: z.string().trim().max(180, 'Keep the note short.').optional().or(z.literal('')),
  plan_date: z.string().min(1, 'Pick a date.'),
  plan_time: z.string().min(1, 'Pick a time.'),
})

