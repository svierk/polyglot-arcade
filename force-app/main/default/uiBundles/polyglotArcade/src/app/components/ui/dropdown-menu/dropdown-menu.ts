/**
 * Copyright (c) 2026, Salesforce, Inc.,
 * All rights reserved.
 * For full license text, see the LICENSE.txt file
 */
import { CdkMenuItem } from '@angular/cdk/menu';
import { NgTemplateOutlet } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	Directive,
	inject,
	Injector,
	input,
	TemplateRef,
	contentChild,
} from '@angular/core';
import { outputFromObservable } from '@angular/core/rxjs-interop';
import type { MenuAlign, MenuSide } from '@spartan-ng/brain/core';
import {
	HlmDropdownMenu,
	HlmDropdownMenuItem,
	HlmDropdownMenuLabel,
	HlmDropdownMenuSeparator,
	HlmDropdownMenuTrigger,
} from '@spartan-ng/styles/dropdown-menu';

// `appDropdownMenuItem` must be a directive (not a component) so it can be applied
// directly to the feature's own `<a>`/`<button>`, preserving native ENTER→click for
// `routerLink` and keyboard nav.
// Marker for the projected menu body. Consumers declare their items inside
// `<ng-template appDropdownMenuContent>` so the template can be rendered *inside*
// the `hlmDropdownMenu` (CdkMenu) with that element's injector — otherwise the
// items resolve DI at their declaration site and can't find `cdk-menu-stack`.
@Directive({ selector: '[appDropdownMenuContent]' })
export class DropdownMenuContentDirective {
	readonly templateRef = inject<TemplateRef<unknown>>(TemplateRef);
}

// Captures the node injector of the `hlmDropdownMenu` element (which carries the
// `cdk-menu-stack` provider) so the projected content can inherit it.
@Directive({ selector: '[appDropdownMenuInjector]', exportAs: 'appDropdownMenuInjector' })
export class DropdownMenuInjectorDirective {
	readonly injector = inject(Injector);
}

@Component({
	selector: 'app-dropdown-menu',
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [
		HlmDropdownMenuTrigger,
		HlmDropdownMenu,
		NgTemplateOutlet,
		DropdownMenuInjectorDirective,
	],
	templateUrl: './dropdown-menu.html',
})
export class DropdownMenuComponent {
	readonly align = input<MenuAlign>('start');
	readonly side = input<MenuSide>('bottom');
	readonly sideOffset = input<number>(1);
	readonly triggerClass = input<string>('');
	readonly ariaLabel = input<string | null>(null, { alias: 'aria-label' });

	protected readonly content = contentChild.required(DropdownMenuContentDirective);
}

@Directive({
	selector: 'a[appDropdownMenuItem], button[appDropdownMenuItem]',
	hostDirectives: [{ directive: HlmDropdownMenuItem, inputs: ['disabled', 'variant', 'inset'] }],
})
export class DropdownMenuItemDirective {
	// outputFromObservable workaround: a parent hostDirective can't re-export a host
	// directive's output directly (raises NG2017), so bridge it via CdkMenuItem's observable.
	readonly triggered = outputFromObservable(inject(CdkMenuItem).triggered);
}

@Component({
	selector: 'app-dropdown-menu-label',
	changeDetection: ChangeDetectionStrategy.OnPush,
	hostDirectives: [{ directive: HlmDropdownMenuLabel, inputs: ['inset'] }],
	template: '<ng-content />',
})
export class DropdownMenuLabelComponent {}

@Component({
	selector: 'app-dropdown-menu-separator',
	changeDetection: ChangeDetectionStrategy.OnPush,
	hostDirectives: [HlmDropdownMenuSeparator],
	template: '',
})
export class DropdownMenuSeparatorComponent {}

export const DropdownMenuImports = [
	DropdownMenuComponent,
	DropdownMenuContentDirective,
	DropdownMenuItemDirective,
	DropdownMenuLabelComponent,
	DropdownMenuSeparatorComponent,
] as const;
