/**
 * Copyright (c) 2026, Salesforce, Inc.,
 * All rights reserved.
 * For full license text, see the LICENSE.txt file
 */
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
	HlmAlert,
	HlmAlertAction,
	HlmAlertDescription,
	HlmAlertTitle,
} from '@spartan-ng/styles/alert';
import { APP_ICONS, type AppIconName } from '../icon/icon';

export type AppAlertVariant = 'default' | 'destructive';

@Component({
	selector: 'app-alert',
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [NgIcon, HlmAlertTitle, HlmAlertDescription],
	providers: [provideIcons(APP_ICONS)],
	hostDirectives: [{ directive: HlmAlert, inputs: ['variant'] }],
	templateUrl: './alert.html',
})
export class AlertComponent {
	readonly variant = input<AppAlertVariant>('default');
	readonly title = input<string>('');
	readonly description = input<string>('');
	readonly icon = input<AppIconName | ''>('');
}

@Component({
	selector: 'app-alert-action',
	changeDetection: ChangeDetectionStrategy.OnPush,
	hostDirectives: [HlmAlertAction],
	template: '<ng-content />',
})
export class AlertActionComponent {}

export const AlertImports = [AlertComponent, AlertActionComponent] as const;
