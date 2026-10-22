/**
 * Copyright (c) 2026, Salesforce, Inc.,
 * All rights reserved.
 * For full license text, see the LICENSE.txt file
 */
import { ChangeDetectionStrategy, Component, computed, inject } from "@angular/core";
import { ButtonComponent } from "../../../components/ui/button/button";
import { ObjectSearchStateService } from "../object-search-state.service";
import type { ActiveFilterValue } from "../utils/filter-utils";

/**
 * Format the display label for one active filter chip. Mirrors the React
 * `formatFilterLabel`; a switch over the filter's declared `type`.
 */
function formatFilterLabel(filter: ActiveFilterValue): string {
	const { label, type, value, min, max } = filter;
	switch (type) {
		case "search":
			return `Search: ${value}`;
		case "text":
		case "picklist":
			return `${label}: ${value}`;
		case "multipicklist": {
			const values = value ? value.split(",") : [];
			if (values.length <= 2) return `${label}: ${values.join(", ")}`;
			return `${label}: ${values.length} selected`;
		}
		case "boolean":
			return `${label}: ${value === "true" ? "Yes" : "No"}`;
		case "numeric": {
			if (min && max) return `${label}: ${min} - ${max}`;
			if (min) return `${label}: >= ${min}`;
			return `${label}: <= ${max}`;
		}
		case "date":
		case "datetime":
		case "daterange":
		case "datetimerange": {
			if (min && max) return `${label}: ${min} to ${max}`;
			if (min) return `${label}: from ${min}`;
			return `${label}: until ${max}`;
		}
		default:
			return label;
	}
}

/**
 * Removable-chip strip for the currently active filters.
 *
 * Reads `filters()` from {@link ObjectSearchStateService}; clicking a chip
 * removes that filter, and the `Clear all` chip clears everything via
 * `resetAll()`. Mirrors the React `ActiveFilters` component.
 */
@Component({
	selector: "app-active-filters",
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [ButtonComponent],
	templateUrl: "./active-filters.html",
})
export class ActiveFiltersComponent {
	private readonly state = inject(ObjectSearchStateService);

	/** Active filters signal from the state service. */
	protected readonly filters = this.state.filters;
	/** Display strings paired with the underlying field for chip actions. */
	protected readonly chips = computed(() =>
		this.filters().map((f) => ({ field: f.field, label: formatFilterLabel(f) })),
	);

	protected onRemove(field: string): void {
		this.state.removeFilter(field);
	}

	protected onClearAll(): void {
		this.state.resetAll();
	}
}
