/**
 * Copyright (c) 2026, Salesforce, Inc.,
 * All rights reserved.
 * For full license text, see the LICENSE.txt file
 */
import { ChangeDetectionStrategy, Component, input } from "@angular/core";
// Post-compose, this lands 3 levels up at app/components/ui/label/__inherit__label.
import { LabelComponent } from "../../../components/ui/label/label";

@Component({
	selector: "app-filter-field-wrapper",
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [LabelComponent],
	templateUrl: "./filter-field-wrapper.html",
})
export class FilterFieldWrapperComponent {
	readonly label = input<string>("");
	readonly htmlFor = input<string | null>(null);
	readonly helpText = input<string | undefined>(undefined);
	readonly error = input<string | undefined>(undefined);
}
