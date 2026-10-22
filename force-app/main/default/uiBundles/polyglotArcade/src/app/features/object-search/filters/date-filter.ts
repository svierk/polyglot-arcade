/**
 * Copyright (c) 2026, Salesforce, Inc.,
 * All rights reserved.
 * For full license text, see the LICENSE.txt file
 */
import { ChangeDetectionStrategy, Component, computed, inject, input } from "@angular/core";
// Base-app UI wrappers, inherited (not recreated) by this feature. Post-compose
// they land at uiBundles/<target>/src/app/components/ui/{date-picker,select}/..., four
// levels up.
import { DatePickerComponent } from "../../../components/ui/date-picker/date-picker";
import {
	SelectComponent,
	type AppSelectOption,
} from "../../../components/ui/select/select";
import { ObjectSearchStateService } from "../object-search-state.service";
import type { FilterFieldConfig, FilterFieldType } from "../utils/filter-utils";
import { FilterFieldWrapperComponent } from "./filter-field-wrapper";

/**
 * Single-date filter — operator select ("After" / "Before") plus a date
 * picker. Emits a filter whose `value` is the operator (`'gt'` or `'lt'`) and
 * whose date is placed in `min` (for `gt`) or `max` (for `lt`), matching the
 * React reference and the `date` / `datetime` branch of `buildSingleFilter`.
 *
 * The `filterType` input toggles the emitted `type` between `'date'` and
 * `'datetime'` (the latter adds start/end-of-day promotion in the filter
 * builder).
 */
type DateOperator = "gt" | "lt";

const OPERATOR_OPTIONS: readonly AppSelectOption[] = [
	{ value: "gt", label: "After" },
	{ value: "lt", label: "Before" },
];

@Component({
	selector: "app-date-filter",
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [DatePickerComponent, SelectComponent, FilterFieldWrapperComponent],
	templateUrl: "./date-filter.html",
})
export class DateFilterComponent {
	private readonly state = inject(ObjectSearchStateService);

	/** Field config: `field`, `label`, `helpText`, ... */
	readonly config = input.required<FilterFieldConfig>();
	/** Underlying filter type — `'date'` (default) or `'datetime'`. */
	readonly filterType = input<FilterFieldType>("date");

	protected readonly operatorOptions = OPERATOR_OPTIONS;

	/** Active filter (if any) — the single source of truth for both fields. */
	private readonly active = computed(() => this.state.filterFor(this.config().field));

	/** Cap the picker at today when the field can't hold a future date. */
	protected readonly maxDate = computed<Date | null>(() =>
		this.config().disableFuture ? new Date() : null,
	);

	/**
	 * Selected operator. Defaults to `'gt'` when no filter is active, mirroring
	 * the React initial state (`min` present -> `gt`, else `lt`, but with no
	 * active filter React ended up on `lt`; we prefer `'gt'` as the safer
	 * "After a date" default when nothing is selected).
	 */
	protected readonly operator = computed<DateOperator>(() => {
		const a = this.active();
		if (a?.value === "gt" || a?.value === "lt") return a.value;
		if (a?.min) return "gt";
		if (a?.max) return "lt";
		return "gt";
	});

	/** Date picker value — parsed from either `min` (gt) or `max` (lt). */
	protected readonly currentDate = computed<Date | null>(() => {
		const a = this.active();
		return toDate(a?.min ?? a?.max);
	});

	protected onOperatorChange(v: string): void {
		const op = v === "lt" ? "lt" : "gt";
		const date = this.currentDate();
		// Only re-emit if we already had a date; otherwise wait until the user
		// picks one (matches React `emitChange` gate on `currentDate`).
		if (date) this.emit(op, date);
	}

	protected onDateChange(date: Date | null | undefined): void {
		const cfg = this.config();
		if (!date) {
			this.state.removeFilter(cfg.field);
		} else {
			this.emit(this.operator(), date);
		}
	}

	private emit(op: DateOperator, date: Date): void {
		const cfg = this.config();
		const dateStr = toDateString(date);
		const isMin = op === "gt";
		this.state.setFilter(cfg.field, {
			field: cfg.field,
			label: cfg.label,
			type: this.filterType(),
			value: op,
			min: isMin ? dateStr : undefined,
			max: isMin ? undefined : dateStr,
		});
	}
}

/** Parses `YYYY-MM-DD` (or any ISO date) into a `Date`, or `null` on failure. */
export function toDate(value: string | undefined): Date | null {
	if (!value) return null;
	// Interpret bare YYYY-MM-DD as a local-time date so the picker doesn't
	// display "yesterday" in negative UTC offsets.
	const parts = value.split("T")[0].split("-");
	if (parts.length === 3) {
		const [y, m, d] = parts.map((p) => Number(p));
		const dt = new Date(y, m - 1, d);
		return isNaN(dt.getTime()) ? null : dt;
	}
	const dt = new Date(value);
	return isNaN(dt.getTime()) ? null : dt;
}

/** Formats a `Date` as `YYYY-MM-DD` in local time. */
export function toDateString(date: Date | null | undefined): string {
	if (!date || isNaN(date.getTime())) return "";
	const y = date.getFullYear();
	// Guard against partially-typed years (e.g. `202` instead of `2026`), which
	// would serialize to an invalid `202-07-09` and be rejected by the API.
	if (y < 1000 || y > 9999) return "";
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}
