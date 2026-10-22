/**
 * Copyright (c) 2026, Salesforce, Inc.,
 * All rights reserved.
 * For full license text, see the LICENSE.txt file
 */

/**
 * filter-utils.ts
 *
 * Centralizes filter-related transformations for the object-search feature:
 *
 * 1. **URL serialization** — filter/sort/pagination state <-> URLSearchParams so
 *    a search can be bookmarked, shared, and restored on reload. Unlike the
 *    React reference, the cursor (`after`) is serialized too, so a deep-linked
 *    or refreshed page renders the exact same result page rather than page 1's
 *    data under a later page number.
 *
 * 2. **GraphQL query building** — the same state -> the `where` clause shape the
 *    GraphQL API expects.
 *
 * Both operate on the shared {@link ActiveFilterValue} type.
 */

import type { SortState } from "./sort-utils";

export type FilterFieldType =
	| "text"
	| "picklist"
	| "numeric"
	| "boolean"
	| "date"
	| "daterange"
	| "datetime"
	| "datetimerange"
	| "multipicklist"
	| "search";

export interface FilterFieldConfig<TFieldName extends string = string> {
	field: TFieldName;
	label: string;
	type: FilterFieldType;
	placeholder?: string;
	/** Required for picklist type. */
	options?: Array<{ value: string; label: string }>;
	helpText?: string;
	/** Required for search type — the fields to match against with `or`. */
	searchFields?: string[];
	/**
	 * For date / datetime / range types: cap the picker at today so future
	 * dates (which can never match a `CreatedDate` / `LastModifiedDate`) can't
	 * be selected.
	 */
	disableFuture?: boolean;
}

export interface ActiveFilterValue<TFieldName extends string = string> {
	field: TFieldName;
	label: string;
	type: FilterFieldType;
	value?: string;
	min?: string;
	max?: string;
}

// ---------------------------------------------------------------------------
// URL Serialization
// ---------------------------------------------------------------------------

/** Namespaces filter params so they don't collide with pagination/flags. */
const FILTER_PREFIX = "f.";
/** URL param key for the multi-field search term. */
const SEARCH_KEY = "q";
/** URL param key for the currently sorted field name. */
const SORT_KEY = "sort";
/** URL param key for the sort direction (ASC or DESC). */
const DIR_KEY = "dir";
/** URL param key for the page size preference. */
const PAGE_SIZE_KEY = "ps";
/** URL param key for the 1-based page number. */
const PAGE_KEY = "page";
/** URL param key for the opaque cursor of the current page's first row. */
const CURSOR_KEY = "after";

/** Snapshot of filter/sort/pagination state used to build a URL query string. */
export interface SearchParamsState {
	filters: ActiveFilterValue[];
	sort: SortState | null;
	pageSize?: number;
	pageIndex?: number;
	/** Opaque `after` cursor for the current page (undefined on page 1). */
	afterCursor?: string;
}

/** The state recovered from a URL query string on load. */
export interface ParsedSearchParams {
	filters: ActiveFilterValue[];
	sort: SortState | null;
	pageSize: number | undefined;
	pageIndex: number;
	afterCursor: string | undefined;
}

/**
 * Serializes filter/sort/pagination state into a `Params` object suitable for
 * Angular Router `queryParams`.
 *
 * Encoding:
 *   - simple values: `f.<field>=<value>`
 *   - range values:  `f.<field>.min=<min>` / `f.<field>.max=<max>`
 *   - search term:   `q=<value>`
 *   - sort:          `sort=<field>&dir=ASC|DESC`
 *   - pagination:    `ps=<size>&page=<1-based>&after=<cursor>`
 */
export function filtersToQueryParams(state: SearchParamsState): Record<string, string> {
	const { filters, sort, pageSize, pageIndex, afterCursor } = state;
	const params: Record<string, string> = {};

	for (const filter of filters) {
		if (filter.type === "search") {
			if (filter.value) params[SEARCH_KEY] = filter.value;
			continue;
		}
		if (filter.value !== undefined && filter.value !== "") {
			params[`${FILTER_PREFIX}${filter.field}`] = filter.value;
		}
		if (filter.min !== undefined && filter.min !== "") {
			params[`${FILTER_PREFIX}${filter.field}.min`] = filter.min;
		}
		if (filter.max !== undefined && filter.max !== "") {
			params[`${FILTER_PREFIX}${filter.field}.max`] = filter.max;
		}
	}

	if (sort) {
		params[SORT_KEY] = sort.field;
		params[DIR_KEY] = sort.direction;
	}

	if (pageSize !== undefined) {
		params[PAGE_SIZE_KEY] = String(pageSize);
	}

	if (pageIndex !== undefined && pageIndex > 0) {
		params[PAGE_KEY] = String(pageIndex + 1);
		// The cursor is only meaningful past page 1. Persisting it (the fix over
		// the React reference) lets a refreshed/shared deep link fetch the right
		// page instead of page 1's rows under a higher page number.
		if (afterCursor) params[CURSOR_KEY] = afterCursor;
	}

	return params;
}

/**
 * Deserializes a URL param map back into filter/sort/pagination state.
 *
 * Requires the filter configs so it knows which params to look for and their
 * types. Unknown params are ignored, making this safe against stale or
 * hand-edited URLs.
 */
export function queryParamsToFilters(
	params: Record<string, string | undefined>,
	configs: FilterFieldConfig[],
): ParsedSearchParams {
	const get = (key: string): string | undefined => {
		const v = params[key];
		return v === undefined || v === null ? undefined : String(v);
	};

	const filters: ActiveFilterValue[] = [];

	for (const config of configs) {
		const { field, label, type } = config;

		if (type === "search") {
			const q = get(SEARCH_KEY);
			if (q) filters.push({ field, label, type: "search", value: q });
			continue;
		}

		const value = get(`${FILTER_PREFIX}${field}`);
		const min = get(`${FILTER_PREFIX}${field}.min`);
		const max = get(`${FILTER_PREFIX}${field}.max`);

		const hasValue = value !== undefined && value !== "";
		const hasRange = (min !== undefined && min !== "") || (max !== undefined && max !== "");

		if (hasValue || hasRange) {
			filters.push({ field, label, type, value, min, max });
		}
	}

	let sort: SortState | null = null;
	const sortField = get(SORT_KEY);
	const sortDir = get(DIR_KEY);
	if (sortField) {
		sort = { field: sortField, direction: sortDir === "DESC" ? "DESC" : "ASC" };
	}

	const pageSizeRaw = get(PAGE_SIZE_KEY);
	const pageSize = pageSizeRaw ? parseInt(pageSizeRaw, 10) : undefined;

	const pageRaw = get(PAGE_KEY);
	const page = pageRaw ? parseInt(pageRaw, 10) : 1;
	const pageIndex = !isNaN(page) && page > 1 ? page - 1 : 0;

	// Cursor only applies past page 1; ignore a stray cursor on page 1.
	const afterCursor = pageIndex > 0 ? get(CURSOR_KEY) : undefined;

	return {
		filters,
		sort,
		pageSize: pageSize && !isNaN(pageSize) ? pageSize : undefined,
		pageIndex,
		afterCursor,
	};
}

// ---------------------------------------------------------------------------
// GraphQL Filter Building
// ---------------------------------------------------------------------------

/**
 * Converts active filters into a GraphQL `where` clause. Each filter becomes a
 * clause via {@link buildSingleFilter}; multiple clauses combine under a
 * top-level `and` (intersection semantics).
 *
 * @returns The `where` object, or `undefined` when no filters are active.
 */
export function buildFilter<TFilter>(
	filters: ActiveFilterValue[],
	configs: FilterFieldConfig[],
): TFilter | undefined {
	const configMap = new Map(configs.map((c) => [c.field, c]));
	const clauses: TFilter[] = [];

	for (const filter of filters) {
		const clause = buildSingleFilter<TFilter>(filter, configMap.get(filter.field));
		if (clause) clauses.push(clause);
	}

	if (clauses.length === 0) return undefined;
	if (clauses.length === 1) return clauses[0];
	return { and: clauses } as TFilter;
}

/** YYYY-MM-DD -> ISO-8601 midnight UTC (inclusive lower bound). */
function toStartOfDay(dateStr: string): string {
	return `${dateStr}T00:00:00.000Z`;
}

/** YYYY-MM-DD -> ISO-8601 last millisecond UTC (inclusive upper bound). */
function toEndOfDay(dateStr: string): string {
	return `${dateStr}T23:59:59.999Z`;
}

/**
 * Converts a single active filter into a GraphQL filter clause.
 *
 * | Type            | Operator(s)    | Example                                             |
 * |-----------------|----------------|-----------------------------------------------------|
 * | text            | like           | `{ Name: { like: "%Acme%" } }`                      |
 * | picklist        | eq             | `{ Industry: { eq: "Technology" } }`                |
 * | multipicklist   | eq or in       | `{ Type: { in: ["A", "B"] } }`                      |
 * | numeric         | gte / lte      | `{ Revenue: { gte: 1000, lte: 5000 } }`             |
 * | boolean         | eq             | `{ IsActive: { eq: true } }`                        |
 * | date/datetime   | dynamic op     | `{ CreatedDate: { gte: { value: "..." } } }`        |
 * | daterange       | gte + lte      | combined with `and` when both bounds set            |
 * | search          | like + or      | `{ or: [{ Name: {like} }, { Phone: {like} }] }`     |
 *
 * @returns A single clause, or `null` if the filter has no meaningful value.
 */
function buildSingleFilter<TFilter>(
	filter: ActiveFilterValue,
	config?: FilterFieldConfig,
): TFilter | null {
	const { field, type, value, min, max } = filter;

	switch (type) {
		case "text": {
			if (!value) return null;
			return { [field]: { like: `%${value}%` } } as TFilter;
		}
		case "picklist": {
			if (!value) return null;
			return { [field]: { eq: value } } as TFilter;
		}
		case "numeric": {
			if (!min && !max) return null;
			const ops: Record<string, number> = {};
			if (min) ops["gte"] = Number(min);
			if (max) ops["lte"] = Number(max);
			return { [field]: ops } as TFilter;
		}
		case "boolean": {
			if (value === undefined || value === "") return null;
			return { [field]: { eq: value === "true" } } as TFilter;
		}
		case "multipicklist": {
			if (!value) return null;
			const values = value.split(",");
			if (values.length === 1) {
				return { [field]: { eq: values[0] } } as TFilter;
			}
			return { [field]: { in: values } } as TFilter;
		}
		case "date": {
			if (!min && !max) return null;
			const op = value ?? (min ? "gte" : "lte");
			const dateStr = min ?? max;
			return { [field]: { [op]: { value: dateStr } } } as TFilter;
		}
		case "daterange": {
			if (!min && !max) return null;
			const clauses: TFilter[] = [];
			if (min) clauses.push({ [field]: { gte: { value: min } } } as TFilter);
			if (max) clauses.push({ [field]: { lte: { value: max } } } as TFilter);
			return clauses.length === 1 ? clauses[0] : ({ and: clauses } as TFilter);
		}
		case "datetime": {
			if (!min && !max) return null;
			const op = value ?? (min ? "gte" : "lte");
			const dateStr = (min ?? max)!;
			const isoStr = op === "gte" || op === "gt" ? toStartOfDay(dateStr) : toEndOfDay(dateStr);
			return { [field]: { [op]: { value: isoStr } } } as TFilter;
		}
		case "datetimerange": {
			if (!min && !max) return null;
			const clauses: TFilter[] = [];
			if (min) clauses.push({ [field]: { gte: { value: toStartOfDay(min) } } } as TFilter);
			if (max) clauses.push({ [field]: { lte: { value: toEndOfDay(max) } } } as TFilter);
			return clauses.length === 1 ? clauses[0] : ({ and: clauses } as TFilter);
		}
		case "search": {
			if (!value) return null;
			const searchFields = config?.searchFields ?? [];
			if (searchFields.length === 0) return null;
			// Dot-notation for relationship fields (e.g. "Owner.Name") builds
			// nested objects: { Owner: { Name: { like: "%x%" } } }.
			const clauses = searchFields.map((f) => {
				const parts = f.split(".");
				let clause: Record<string, unknown> = { like: `%${value}%` };
				for (let i = parts.length - 1; i >= 0; i--) {
					clause = { [parts[i]]: clause };
				}
				return clause as TFilter;
			});
			if (clauses.length === 1) return clauses[0];
			return { or: clauses } as TFilter;
		}
		default:
			return null;
	}
}
