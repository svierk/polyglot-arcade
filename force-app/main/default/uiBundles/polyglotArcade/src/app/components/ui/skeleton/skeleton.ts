/**
 * Copyright (c) 2026, Salesforce, Inc.,
 * All rights reserved.
 * For full license text, see the LICENSE.txt file
 */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HlmSkeleton } from '@spartan-ng/styles/skeleton';

@Component({
  selector: 'app-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [HlmSkeleton],
  host: {
    'aria-hidden': 'true',
  },
  template: '<ng-content />',
})
export class SkeletonComponent {}

export const SkeletonImports = [SkeletonComponent] as const;
