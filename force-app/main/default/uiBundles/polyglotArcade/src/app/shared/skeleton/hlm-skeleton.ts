import { Directive } from '@angular/core';
import { classes } from '@spartan-ng/styles/utils';

@Directive({
  selector: '[hlmSkeleton],hlm-skeleton',
  host: {
    'data-slot': 'skeleton',
  },
})
export class HlmSkeleton {
  constructor() {
    classes(() => 'bg-accent rounded-md block motion-safe:animate-pulse');
  }
}
