/**
 * Copyright (c) 2026, Salesforce, Inc.,
 * All rights reserved.
 * For full license text, see the LICENSE.txt file
 */
import {
	ChangeDetectionStrategy,
	Component,
	DestroyRef,
	computed,
	effect,
	inject,
	input,
	signal,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { Subject } from "rxjs";
import { debounceTime } from "rxjs/operators";
import { InputComponent } from "../../../components/ui/input/input";
import { ObjectSearchStateService } from "../object-search-state.service";
import { FILTER_DEBOUNCE_MS } from "../utils/debounce";
import type { FilterFieldConfig } from "../utils/filter-utils";
import { FilterFieldWrapperComponent } from "./filter-field-wrapper";

/**
 * Numeric range filter — paired `min` / `max` inputs whose committed values are
 * written as strings on a `type: 'numeric'` filter (numeric coercion happens
 * in `buildSingleFilter`). A trailing debounce commits the pair, skipping
 * writes when the range is inverted or out of `boundMin` / `boundMax`.
 */
@Component({
	selector: "app-numeric-range-filter",
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [InputComponent, FilterFieldWrapperComponent],
	templateUrl: "./numeric-range-filter.html",
})
export class NumericRangeFilterComponent {
	private readonly state = inject(ObjectSearchStateService);
	private readonly destroyRef = inject(DestroyRef);

	readonly config = input.required<FilterFieldConfig>();
	readonly boundMin = input<number | undefined>(undefined);
	readonly boundMax = input<number | undefined>(undefined);

	protected readonly localMin = signal<string>("");
	protected readonly localMax = signal<string>("");

	private readonly commit$ = new Subject<{ min: string; max: string }>();

	constructor() {
		this.commit$
			.pipe(debounceTime(FILTER_DEBOUNCE_MS), takeUntilDestroyed(this.destroyRef))
			.subscribe(({ min, max }) => this.commit(min, max));

		// Sync local inputs from shared state (URL restore / reset-all).
		effect(() => {
			const cfg = this.config();
			const active = this.state.filterFor(cfg.field);
			this.localMin.set(active?.min ?? "");
			this.localMax.set(active?.max ?? "");
		});
	}

	protected readonly minOutOfBounds = computed(() => this.isOutOfBounds(this.localMin()));
	protected readonly maxOutOfBounds = computed(() => this.isOutOfBounds(this.localMax()));
	protected readonly isRangeInverted = computed(() => {
		const lo = this.localMin();
		const hi = this.localMax();
		return lo !== "" && hi !== "" && Number(lo) > Number(hi);
	});
	protected readonly hasError = computed(
		() => this.minOutOfBounds() || this.maxOutOfBounds() || this.isRangeInverted(),
	);

	protected readonly errorMessage = computed<string | undefined>(() => {
		if (this.isRangeInverted()) return "Min must not exceed max";
		if (!this.minOutOfBounds() && !this.maxOutOfBounds()) return undefined;
		const lo = this.boundMin();
		const hi = this.boundMax();
		if (lo != null && hi != null) return `Value must be between ${lo}–${hi}`;
		if (lo != null) return `Value must be ${lo} or more`;
		if (hi != null) return `Value must be ${hi} or less`;
		return undefined;
	});

	protected onMinChange(v: string): void {
		this.localMin.set(v);
		this.commit$.next({ min: v, max: this.localMax() });
	}

	protected onMaxChange(v: string): void {
		this.localMax.set(v);
		this.commit$.next({ min: this.localMin(), max: v });
	}

	private isOutOfBounds(v: string): boolean {
		if (v === "") return false;
		const n = Number(v);
		const lo = this.boundMin();
		const hi = this.boundMax();
		return (lo != null && n < lo) || (hi != null && n > hi);
	}

	private commit(min: string, max: string): void {
		const cfg = this.config();
		if (!min && !max) {
			this.state.removeFilter(cfg.field);
			return;
		}
		const minNum = min !== "" ? Number(min) : null;
		const maxNum = max !== "" ? Number(max) : null;
		// Skip writes that would produce an inverted or out-of-bounds clause;
		// the UI keeps the input contents so the user can correct in place.
		if (minNum != null && maxNum != null && minNum > maxNum) return;
		const lo = this.boundMin();
		const hi = this.boundMax();
		if (minNum != null && ((lo != null && minNum < lo) || (hi != null && minNum > hi))) return;
		if (maxNum != null && ((lo != null && maxNum < lo) || (hi != null && maxNum > hi))) return;

		this.state.setFilter(cfg.field, {
			field: cfg.field,
			label: cfg.label,
			type: "numeric",
			min,
			max,
		});
	}
}
