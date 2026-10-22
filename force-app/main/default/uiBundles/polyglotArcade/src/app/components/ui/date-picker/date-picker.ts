/**
 * Copyright (c) 2026, Salesforce, Inc.,
 * All rights reserved.
 * For full license text, see the LICENSE.txt file
 */
import {
	ChangeDetectionStrategy,
	Component,
	booleanAttribute,
	computed,
	input,
	model,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { HlmDatePickerImports } from '@spartan-ng/styles/date-picker';
import type { AppFieldSize } from '../field-size';

@Component({
	selector: 'app-date-picker',
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [HlmDatePickerImports, NgClass],
	host: { class: 'block min-w-0' },
	templateUrl: './date-picker.html',
})
export class DatePickerComponent {
	readonly value = model<Date | null | undefined>(undefined);
	readonly label = input<string>('');
	readonly placeholder = input<string>('');
	readonly disabled = input(false, { transform: booleanAttribute });
	readonly readonly = input(false, { transform: booleanAttribute });
	readonly size = input<AppFieldSize>('default');
	readonly min = input<Date | null>(null);
	readonly max = input<Date | null>(null);

	private static _uid = 0;
	protected readonly labelId = `app-date-picker-${DatePickerComponent._uid++}`;

	protected readonly wrapperClasses = computed(() => {
		const cls: string[] = [];
		const s = this.size();
		if (s === 'sm')
			cls.push('[&_[data-slot=input-group]]:h-6', '[&_[data-slot=input-group]]:text-xs');
		if (s === 'lg')
			cls.push('[&_[data-slot=input-group]]:h-10', '[&_[data-slot=input-group]]:text-lg');
		return cls;
	});
}

export const DatePickerImports = [DatePickerComponent] as const;
