/**
 * Copyright (c) 2026, Salesforce, Inc.,
 * All rights reserved.
 * For full license text, see the LICENSE.txt file
 */
import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { HlmPopoverImports } from '@spartan-ng/styles/popover';

@Component({
	selector: 'app-popover',
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [HlmPopoverImports],
	templateUrl: './popover.html',
})
export class PopoverComponent {
	readonly open = model<boolean>(false);
	readonly align = input<'start' | 'center' | 'end'>('start');
	readonly sideOffset = input<number>(4);
	// The wrapper owns the single real trigger `<button>` (so callers project
	// plain content, never a nested button); these style/label it.
	readonly triggerClass = input<string>('');
	readonly ariaLabel = input<string | null>(null, { alias: 'aria-label' });

	toggle(): void {
		this.open.set(!this.open());
	}

	close(): void {
		this.open.set(false);
	}

	protected onStateChanged(state: 'open' | 'closed'): void {
		this.open.set(state === 'open');
	}
}

export const PopoverImports = [PopoverComponent] as const;
