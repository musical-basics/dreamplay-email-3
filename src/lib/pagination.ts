export interface Pagination {
  limit: number;
  offset: number;
}

export function paginationFromUrl(url: URL, defaults: Partial<Pagination> = {}): Pagination {
  const rawLimit = Number(url.searchParams.get("limit") || defaults.limit || 25);
  const rawOffset = Number(url.searchParams.get("offset") || defaults.offset || 0);

  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.trunc(rawLimit), 1), 100) : 25;
  const offset = Number.isFinite(rawOffset) ? Math.max(Math.trunc(rawOffset), 0) : 0;

  return { limit, offset };
}

export function rangeFor({ limit, offset }: Pagination): [number, number] {
  return [offset, offset + limit - 1];
}

export function listEnvelope<T>(data: T[] | null, pagination: Pagination, count: number | null) {
  return {
    data: data || [],
    pagination: {
      ...pagination,
      count: count ?? null,
    },
  };
}
