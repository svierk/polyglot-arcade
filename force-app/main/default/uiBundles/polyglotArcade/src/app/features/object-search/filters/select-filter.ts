/**
 * Copyright (c) 2026, Salesforce, Inc.,
 * All rights reserved.
 * For full license text, see the LICENSE.txt file
 */
import { ChangeDetectionStrategy, Component, computed, inject, input } from "@angular/core";
import {
	SelectComponent,
	type AppSelectOption,
} from "../../../components/ui/select/select";
import { ObjectSearchStateService } from "../object-search-state.service";
import type { FilterFieldConfig } from "../utils/filter-utils";
import { FilterFieldWrapperComponent } from "./filter-field-wrapper";

// A leading "All" entry (empty value) clears the filter.
const ALL_VALUE = "";

@Component({
	selector: "app-select-filter",
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [SelectComponent, FilterFieldWrapperComponent],
	templateUrl: "./select-filter.html",
})
export class SelectFilterComponent {
	private readonly state = inject(ObjectSearchStateService);

	readonly config = input.required<FilterFieldConfig>();

	protected readonly options = computed<readonly AppSelectOption[]>(() => [
		{ value: ALL_VALUE, label: "All" },
		...(this.config().options ?? []),
	]);

	protected readonly currentValue = computed(
		() => this.state.filterFor(this.config().field)?.value ?? ALL_VALUE,
	);

	protected onValueChange(v: string): void {
		const cfg = this.config();
		if (v === ALL_VALUE) {
			this.state.removeFilter(cfg.field);
		} else {
			this.state.setFilter(cfg.field, {
				field: cfg.field,
				label: cfg.label,
				type: "picklist",
				value: v,
			});
		}
	}
}
