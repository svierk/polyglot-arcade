/**
 * Copyright (c) 2026, Salesforce, Inc.,
 * All rights reserved.
 * For full license text, see the LICENSE.txt file
 */
import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { HlmDialogImports } from '@spartan-ng/styles/dialog';

@Component({
	selector: 'app-dialog',
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [HlmDialogImports],
	templateUrl: './dialog.html',
})
export class DialogComponent {
	readonly open = model<boolean>(false);
	readonly closeOnBackdrop = input<boolean>(true);
	readonly ariaLabel = input<string | null>(null, { alias: 'aria-label' });
	readonly ariaLabelledby = input<string | null>(null, { alias: 'aria-labelledby' });
	readonly closed = output<void>();

	show(): void {
		this.open.set(true);
	}

	close(): void {
		if (this.open()) {
			this.open.set(false);
			this.closed.emit();
		}
	}

	protected onStateChanged(state: 'open' | 'closed'): void {
		if (state === 'closed' && this.open()) {
			this.close();
		}
	}
}

export const DialogImports = [DialogComponent] as const;
