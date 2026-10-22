/**
 * Copyright (c) 2026, Salesforce, Inc.,
 * All rights reserved.
 * For full license text, see the LICENSE.txt file
 */
import { ChangeDetectionStrategy, Component, input, model } from "@angular/core";
import { InputComponent } from "../../../components/ui/input/input";

/**
 * Presentational search box: a text input with a leading search icon inside
 * its border, purely controlled via `value` with no search state of its own.
 * Reused by the Home landing form and by `app-search-filter` (which adds the
 * debounce + shared-state wiring around it).
 */
@Component({
	selector: "app-search-bar",
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [InputComponent],
	host: { class: "flex-1 block" },
	templateUrl: "./search-bar.html",
})
export class SearchBarComponent {
	readonly value = model<string>("");
	readonly placeholder = input<string>("");
	readonly label = input<string>("");
	readonly ariaLabel = input<string>("");
	readonly inputId = input<string>("");
}
