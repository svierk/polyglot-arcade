/**
 * Copyright (c) 2026, Salesforce, Inc.,
 * All rights reserved.
 * For full license text, see the LICENSE.txt file
 */
import { booleanAttribute, ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { HlmCollapsibleImports } from '@spartan-ng/styles/collapsible';

@Component({
	selector: 'app-collapsible',
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [HlmCollapsibleImports],
	templateUrl: './collapsible.html',
})
export class CollapsibleComponent {
	readonly open = model<boolean>(false);
	readonly title = input<string>('');
	readonly disabled = input(false, { transform: booleanAttribute });
}

export const CollapsibleImports = [CollapsibleComponent] as const;
