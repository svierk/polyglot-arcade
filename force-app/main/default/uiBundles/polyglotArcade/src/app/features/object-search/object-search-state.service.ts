/**
 * Copyright (c) 2026, Salesforce, Inc.,
 * All rights reserved.
 * For full license text, see the LICENSE.txt file
 */
import { computed, DestroyRef, inject, Injectable, signal, type Signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { ActivatedRoute, Router } from "@angular/router";
import { Subject } from "rxjs";
import { debounceTime } from "rxjs/operators";
import {
	buildFilter,
	filtersToQueryParams,
	queryParamsToFilters,
	type ActiveFilterValue,
	type FilterFieldConfig,
} from "./utils/filter-utils";
import { buildOrderBy, type SortState } from "./utils/sort-utils";

/** How long to wait before flushing state changes to the URL. */
const URL_SYNC_DEBOUNCE_MS = 300;

/** Cursor-pagination configuration for an object-search page. */
export interface PaginationConfig {
	defaultPageSize: number;
	validPageSizes: number[];
}

/** Derived, API-ready query signals returned from {@link ObjectSearchStateService.init}. */
export interface ObjectSearchQuery<TFilter, TOrderBy> {
	where: Signal<TFilter | undefined>;
	orderBy: Signal<TOrderBy | undefined>;
}

/**
 * Filter / sort / cursor-pagination state for one object-search page — the
 * Angular analogue of the React `useObjectSearchParams` hook plus
 * `FilterContext`.
 *
 * ## State model
 * Signals drive instant UI updates. The URL query params are the durable source
 * of truth so a refresh or shared link restores the same view. URL writes are
 * debounced (300 ms) to avoid history spam.
 *
 * Unlike the React reference, the pagination cursor (`after`) is part of the URL
 * (see {@link filtersToQueryParams}), so a deep-linked page N fetches page N's
 * rows rather than page 1's rows shown under a higher page number.
 *
 * ## Scope
 * Provide per route/component (`providers: [ObjectSearchStateService]`), NOT in
 * root — each search page owns its own state and cursor stack.
 *
 * ## Usage
 * Call {@link init} once from the hosting component with the field/pagination
 * config, then read the exposed signals and call the mutators.
 */
@Injectable()
export class ObjectSearchStateService {
	private readonly router = inject(Router);
	private readonly route = inject(ActivatedRoute);
	private readonly destroyRef = inject(DestroyRef);

	private filterConfigs: FilterFieldConfig[] = [];
	private defaultPageSize = 10;
	private validPageSizes: number[] = [10];
	private initialized = false;

	// -- Core state signals -----------------------------------------------------
	private readonly _filters = signal<ActiveFilterValue[]>([]);
	private readonly _sort = signal<SortState | null>(null);
	private readonly _pageSize = signal<number>(10);
	private readonly _pageIndex = signal<number>(0);
	private readonly _afterCursor = signal<string | undefined>(undefined);

	/** Cursor stack for "previous page" — mirrors the React ref-held stack. */
	private cursorStack: string[] = [];
	/** Coalesces rapid state changes into a single debounced URL write. */
	private readonly urlSync$ = new Subject<void>();

	// -- Public read signals -----------------------------------------------------
	readonly filters: Signal<ActiveFilterValue[]> = this._filters.asReadonly();
	readonly sort: Signal<SortState | null> = this._sort.asReadonly();
	readonly pageSize: Signal<number> = this._pageSize.asReadonly();
	readonly pageIndex: Signal<number> = this._pageIndex.asReadonly();
	readonly afterCursor: Signal<string | undefined> = this._afterCursor.asReadonly();
	readonly hasActiveFilters = computed(() => this._filters().length > 0);
	readonly hasPreviousPage = computed(() => this._pageIndex() > 0);

	constructor() {
		this.urlSync$
			.pipe(debounceTime(URL_SYNC_DEBOUNCE_MS), takeUntilDestroyed(this.destroyRef))
			.subscribe(() => this.flushToUrl());
	}

	/**
	 * Initializes the service from the given config and seeds state from the
	 * current URL. Safe to call once; subsequent calls only recompute the
	 * derived query signals.
	 */
	init<TFilter, TOrderBy>(
		filterConfigs: FilterFieldConfig[],
		paginationConfig?: PaginationConfig,
	): ObjectSearchQuery<TFilter, TOrderBy> {
		if (!this.initialized) {
			this.initialized = true;
			this.filterConfigs = filterConfigs;
			this.defaultPageSize = paginationConfig?.defaultPageSize ?? 10;
			this.validPageSizes = paginationConfig?.validPageSizes ?? [this.defaultPageSize];
			this.seedFromUrl();
		}

		const where = computed(() => buildFilter<TFilter>(this._filters(), this.filterConfigs));
		const orderBy = computed(() => buildOrderBy<TOrderBy>(this._sort()));
		return { where, orderBy };
	}

	// -- Filter mutators ---------------------------------------------------------

	/** Adds or replaces the filter for `field`; `undefined` removes it. */
	setFilter(field: string, value: ActiveFilterValue | undefined): void {
		this._filters.update((prev) => {
			const next = prev.filter((f) => f.field !== field);
			if (value) next.push(value);
			return next;
		});
		this.resetPagination();
		this.urlSync$.next();
	}

	/** Removes the active filter for `field`, if any. */
	removeFilter(field: string): void {
		this._filters.update((prev) => prev.filter((f) => f.field !== field));
		this.resetPagination();
		this.urlSync$.next();
	}

	/** Reads the active filter value for a field (for filter components). */
	filterFor(field: string): ActiveFilterValue | undefined {
		return this._filters().find((f) => f.field === field);
	}

	// -- Sort mutator ------------------------------------------------------------

	/** Sets (or clears) the sort; resets pagination to the first page. */
	setSort(sort: SortState | null): void {
		this._sort.set(sort);
		this.resetPagination();
		this.urlSync$.next();
	}

	// -- Pagination mutators -----------------------------------------------------

	/** Advances to the next page using the supplied `endCursor`. */
	goToNextPage(endCursor: string): void {
		this.cursorStack = [...this.cursorStack, endCursor];
		this._afterCursor.set(endCursor);
		this._pageIndex.update((i) => i + 1);
		this.urlSync$.next();
	}

	/** Returns to the previous page by popping the cursor stack. */
	goToPreviousPage(): void {
		this.cursorStack = this.cursorStack.slice(0, -1);
		const prev =
			this.cursorStack.length > 0 ? this.cursorStack[this.cursorStack.length - 1] : undefined;
		this._afterCursor.set(prev);
		this._pageIndex.update((i) => Math.max(0, i - 1));
		this.urlSync$.next();
	}

	/** Sets a validated page size and resets pagination. */
	setPageSize(size: number): void {
		this._pageSize.set(this.getValidPageSize(size));
		this.resetPagination();
		this.urlSync$.next();
	}

	// -- Reset -------------------------------------------------------------------

	/** Clears all filters, sort, and pagination in one call (flushed at once). */
	resetAll(): void {
		this._filters.set([]);
		this._sort.set(null);
		this._pageSize.set(this.defaultPageSize);
		this.resetPagination();
		this.flushToUrl();
	}

	// -- Internals ---------------------------------------------------------------

	private resetPagination(): void {
		this._pageIndex.set(0);
		this._afterCursor.set(undefined);
		this.cursorStack = [];
	}

	private getValidPageSize(size: number): number {
		return this.validPageSizes.includes(size) ? size : this.defaultPageSize;
	}

	private seedFromUrl(): void {
		const params = this.route.snapshot.queryParams as Record<string, string | undefined>;
		const parsed = queryParamsToFilters(params, this.filterConfigs);
		this._filters.set(parsed.filters);
		this._sort.set(parsed.sort);
		this._pageSize.set(this.getValidPageSize(parsed.pageSize ?? this.defaultPageSize));
		this._pageIndex.set(parsed.pageIndex);
		this._afterCursor.set(parsed.afterCursor);
		// Rebuild a minimal cursor stack so "previous" works after a deep link.
		// Pages before the current one are unknown, so pad the stack with the
		// current cursor; going back drains it and eventually returns to page 1.
		if (parsed.pageIndex > 0 && parsed.afterCursor) {
			this.cursorStack = Array<string>(parsed.pageIndex).fill(parsed.afterCursor);
		}
	}

	private flushToUrl(): void {
		const queryParams = filtersToQueryParams({
			filters: this._filters(),
			sort: this._sort(),
			pageSize: this._pageSize(),
			pageIndex: this._pageIndex(),
			afterCursor: this._afterCursor(),
		});
		void this.router.navigate([], {
			relativeTo: this.route,
			queryParams,
			// Replace so filter typing doesn't flood browser history.
			replaceUrl: true,
		});
	}
}
