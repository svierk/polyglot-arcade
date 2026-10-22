import { Directive, input } from '@angular/core';
import { classes } from '@spartan-ng/styles/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const alertVariants = cva(
	'relative w-full grid gap-0.5 items-start rounded-lg border px-2.5 py-2 text-start text-sm has-data-[slot=alert-action]:pe-18 has-[>ng-icon]:grid-cols-[auto_1fr] has-[>ng-icon]:gap-x-2 *:[ng-icon]:row-span-2 *:[ng-icon]:translate-y-0.5 *:[ng-icon]:text-current *:[ng-icon:not([class*=text-])]:text-[length:--spacing(4)] group/alert',
	{
		variants: {
			variant: {
				default: 'bg-card text-card-foreground',
				destructive: 'bg-card text-destructive',
			},
		},
		defaultVariants: {
			variant: 'default',
		},
	},
);

export type AlertVariants = VariantProps<typeof alertVariants>;

@Directive({
	selector: 'hlm-alert,[hlmAlert]',
	host: {
		'data-slot': 'alert',
		role: 'alert',
	},
})
export class HlmAlert {
	public readonly variant = input<AlertVariants['variant']>('default');

	constructor() {
		classes(() => alertVariants({ variant: this.variant() }));
	}
}
