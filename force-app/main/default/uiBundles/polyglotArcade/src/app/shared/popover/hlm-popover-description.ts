import { Directive } from '@angular/core';
import { classes } from '@spartan-ng/styles/utils';

@Directive({
	selector: '[hlmPopoverDescription]',
	host: { 'data-slot': 'popover-description' },
})
export class HlmPopoverDescription {
	constructor() {
		classes(() => 'text-muted-foreground');
	}
}
