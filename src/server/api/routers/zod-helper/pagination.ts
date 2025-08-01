import { z, type ZodType } from 'zod';

export const paginationSchema = z
  .object({
    page: z.number().min(1).default(1),
    pageSize: z.number().min(1).max(100).default(10),
  })
  .default({ page: 1, pageSize: 10 });

export type PaginationInput = z.infer<typeof paginationSchema>;

export const paginationInput = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(10),
});
export const paginationOutput = z.object({ total: z.number() });
export function wrapPaginationOutput<T extends ZodType>(resultItemSchema: T) {
  return z.object({ result: z.array(resultItemSchema) }).merge(paginationOutput);
}
const PaginationOutput = wrapPaginationOutput(z.unknown());
export type PaginationOutput = z.infer<typeof PaginationOutput>;
export type PickPaginationOutputResult<T> = T extends PaginationOutput ? T['result'][number] : never;
