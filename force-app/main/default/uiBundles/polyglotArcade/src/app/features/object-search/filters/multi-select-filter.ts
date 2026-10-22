/**
 * Copyright (c) 2026, Salesforce, Inc.,
 * All rights reserved.
 * For full license text, see the LICENSE.txt file
 */
import { ChangeDetectionStrategy, Component, computed, inject, input } from "@angular/core";
import type { AppFieldSize } from "../../../components/ui/field-size";
import { SelectComponent } from "../../../components/ui/select/select";
import { ObjectSearchStateService } from "../object-search-state.service";
import type { FilterFieldConfig } from "../utils/filter-utils";
import { FilterFieldWrapperComponent } from "./filter-field-wrapper";

/**
 * Multi-select picklist filter. All presentation (checkbox options, trigger
 * summary, height) lives in `app-select multiple`; this component only bridges
 * the UI's `string[]` selection to the object-search state, serializing it into
 * the comma-joined string the `type: 'multipicklist'` contract expects
 * (`buildSingleFilter` maps that to `{ eq }` for one value, `{ in: [...] }` for
 * many).
 */
@Component({
	selector: "app-multi-select-filter",
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [SelectComponent, FilterFieldWrapperComponent],
	templateUrl: "./multi-select-filter.html",
})
export class MultiSelectFilterComponent {
	private readonly state = inject(ObjectSearchStateService);

	/** Field config: `field`, `label`, `options`, `helpText`, ... */
	readonly config = input.required<FilterFieldConfig>();

	/** Field height: `sm` = 24px, `default` = 32px, `lg` = 40px. */
	readonly size = input<AppFieldSize>("default");

	/** Currently selected option values (parsed back from the comma-joined string). */
	protected readonly selected = computed<string[]>(() => {
		const raw = this.state.filterFor(this.config().field)?.value;
		return raw ? raw.split(",") : [];
	});

	/** Placeholder shown on the trigger when nothing is selected. */
	protected readonly placeholder = computed(() => `Select ${this.config().label.toLowerCase()}`);

	protected onSelectionChange(next: readonly string[]): void {
		const cfg = this.config();
		if (next.length === 0) {
			this.state.removeFilter(cfg.field);
		} else {
			this.state.setFilter(cfg.field, {
				field: cfg.field,
				label: cfg.label,
				type: "multipicklist",
				value: next.join(","),
			});
		}
	}
}
