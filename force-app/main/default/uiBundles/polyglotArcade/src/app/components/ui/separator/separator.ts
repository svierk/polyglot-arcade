/**
 * Copyright (c) 2026, Salesforce, Inc.,
 * All rights reserved.
 * For full license text, see the LICENSE.txt file
 */
import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import { BrnSeparator } from '@spartan-ng/brain/separator';
import { hlmSeparatorClass } from '@spartan-ng/styles/separator';
import { classes } from '@spartan-ng/styles/utils';

export type AppSeparatorOrientation = 'horizontal' | 'vertical';

@Component({
	selector: 'app-separator',
	changeDetection: ChangeDetectionStrategy.OnPush,
	hostDirectives: [{ directive: BrnSeparator, inputs: ['orientation', 'decorative'] }],
	host: {
		'data-slot': 'separator',
	},
	template: '',
})
export class SeparatorComponent {
	readonly orientation = input<AppSeparatorOrientation>('horizontal');
	readonly decorative = input(true, { transform: booleanAttribute });

	constructor() {
		classes(() => hlmSeparatorClass);
	}
}

export const SeparatorImports = [SeparatorComponent] as const;
