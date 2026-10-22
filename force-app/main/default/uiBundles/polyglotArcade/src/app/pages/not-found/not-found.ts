/**
 * Copyright (c) 2026, Salesforce, Inc.,
 * All rights reserved.
 * For full license text, see the LICENSE.txt file
 */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
	selector: 'app-not-found',
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [RouterLink],
	templateUrl: './not-found.html',
})
export class NotFoundComponent {}
