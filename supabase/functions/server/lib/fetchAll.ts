// Reads every row of a query, a page at a time. PostgREST caps one response
// (1,000 rows by default), so a single select silently undercounts once a
// table grows past it — analytics totals and exports used to do exactly that.
//
// `page(from, to)` must build the same ordered query each time and apply
// .range(from, to); give it a stable order (e.g. created_at + id).
export async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  pageSize = 1000,
  max = 200_000,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < max; from += pageSize) {
    const { data, error } = await page(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < pageSize) break;
  }
  return out;
}
