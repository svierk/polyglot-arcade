/**
 * Copyright (c) 2026, Salesforce, Inc.,
 * All rights reserved.
 * For full license text, see the LICENSE.txt file
 */
import { ChangeDetectionStrategy, Component, computed, inject, input } from "@angular/core";
import {
	DateRange,
	DateRangePickerComponent,
} from "../../../components/ui/date-range-picker/date-range-picker";
import { ObjectSearchStateService } from "../object-search-state.service";
import type { FilterFieldConfig, FilterFieldType } from "../utils/filter-utils";
import { toDate, toDateString } from "./date-filter";
import { FilterFieldWrapperComponent } from "./filter-field-wrapper";

/**
 * Date range filter — a two-ended range picker. Emits a `daterange` (or
 * `datetimerange`) filter with `min` / `max` as `YYYY-MM-DD` strings.
 */
@Component({
	selector: "app-date-range-filter",
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [DateRangePickerComponent, FilterFieldWrapperComponent],
	templateUrl: "./date-range-filter.html",
})
export class DateRangeFilterComponent {
	private readonly state = inject(ObjectSearchStateService);

	readonly config = input.required<FilterFieldConfig>();
	readonly filterType = input<FilterFieldType>("daterange");

	private readonly active = computed(() => this.state.filterFor(this.config().field));

	protected readonly range = computed<DateRange<Date>>(() => ({
		start: toDate(this.active()?.min),
		end: toDate(this.active()?.max),
	}));

	/** Cap the picker at today when the field can't hold a future date. */
	protected readonly maxDate = computed<Date | null>(() =>
		this.config().disableFuture ? new Date() : null,
	);

	protected onRangeChange(range: DateRange<Date> | null): void {
		const cfg = this.config();
		const from = range?.start ?? null;
		const to = range?.end ?? null;
		if (!from && !to) {
			this.state.removeFilter(cfg.field);
			return;
		}
		this.state.setFilter(cfg.field, {
			field: cfg.field,
			label: cfg.label,
			type: this.filterType(),
			min: toDateString(from),
			max: toDateString(to),
		});
	}
}
