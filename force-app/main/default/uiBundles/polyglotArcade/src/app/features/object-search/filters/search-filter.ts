/**
 * Copyright (c) 2026, Salesforce, Inc.,
 * All rights reserved.
 * For full license text, see the LICENSE.txt file
 */
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	DestroyRef,
	effect,
	inject,
	input,
	signal,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { Subject } from "rxjs";
import { debounceTime } from "rxjs/operators";
import { SearchBarComponent } from "../search-bar/search-bar";
import { ObjectSearchStateService } from "../object-search-state.service";
import { FILTER_DEBOUNCE_MS } from "../utils/debounce";
import type { FilterFieldConfig } from "../utils/filter-utils";
import { FilterFieldWrapperComponent } from "./filter-field-wrapper";

/**
 * Multi-field search filter — a debounced input applied via `like %value%`
 * across every field named in `config.searchFields` (combined with a
 * top-level `or`, see {@link buildFilter}).
 */
@Component({
	selector: "app-search-filter",
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [SearchBarComponent, FilterFieldWrapperComponent],
	templateUrl: "./search-filter.html",
})
export class SearchFilterComponent {
	private readonly state = inject(ObjectSearchStateService);
	private readonly destroyRef = inject(DestroyRef);

	readonly config = input.required<FilterFieldConfig>();

	// Ties the wrapper's <label for> to the search input.
	protected readonly fieldId = computed(() => `filter-${this.config().field}`);

	protected readonly localValue = signal<string>("");
	private readonly commit$ = new Subject<string>();

	constructor() {
		this.commit$
			.pipe(debounceTime(FILTER_DEBOUNCE_MS), takeUntilDestroyed(this.destroyRef))
			.subscribe((v) => this.commit(v));

		effect(() => {
			const cfg = this.config();
			const external = this.state.filterFor(cfg.field)?.value ?? "";
			this.localValue.set(external);
		});
	}

	protected onValueChange(v: string): void {
		this.localValue.set(v);
		this.commit$.next(v);
	}

	private commit(v: string): void {
		const cfg = this.config();
		if (v) {
			this.state.setFilter(cfg.field, {
				field: cfg.field,
				label: cfg.label,
				type: "search",
				value: v,
			});
		} else {
			this.state.removeFilter(cfg.field);
		}
	}
}
