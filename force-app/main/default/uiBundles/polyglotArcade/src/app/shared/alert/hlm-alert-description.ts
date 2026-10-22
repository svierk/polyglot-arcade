import { Directive } from '@angular/core';
import { classes } from '@spartan-ng/styles/utils';

@Directive({
  selector: '[hlmAlertDescription]',
  host: {
    'data-slot': 'alert-description',
  },
})
export class HlmAlertDescription {
  constructor() {
    classes(
      () =>
        'text-sm text-balance md:text-pretty group-has-[>ng-icon]/alert:col-start-2 [&_p:not(:last-child)]:mb-4 [&_a]:hover:text-foreground [&_a]:underline [&_a]:underline-offset-3',
    );
  }
}
