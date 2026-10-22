import {
	booleanAttribute,
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCalendar, lucideX } from '@ng-icons/lucide';
import {
	BrnDateInput,
	type BrnDatePickerTriggerBase,
	provideBrnDatePickerTrigger,
} from '@spartan-ng/brain/date-picker';
import { BrnFieldControl } from '@spartan-ng/brain/field';
import type { BooleanInput } from '@angular/cdk/coercion';
import { HlmInputGroup, HlmInputGroupImports } from '@spartan-ng/styles/input-group';
import { injectHlmDatePickerConfig } from './hlm-date-picker.token';

@Component({
	selector: 'hlm-date-picker-input',
	imports: [HlmInputGroupImports, NgIcon],
	providers: [
		provideIcons({ lucideCalendar, lucideX }),
		provideBrnDatePickerTrigger(HlmDatePickerInput),
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	hostDirectives: [HlmInputGroup],
	template: `
		<input
			#input
			hlmInputGroupInput
			[value]="_inputValue()"
			[id]="inputId()"
			[placeholder]="placeholder()"
			[disabled]="_disabled()"
			[readonly]="readonly()"
			[forceInvalid]="forceInvalid()"
			[attr.aria-invalid]="_ariaInvalid()"
			[attr.data-invalid]="_ariaInvalid()"
			[attr.data-touched]="_touched?.() ? 'true' : null"
			[attr.data-dirty]="_dirty?.() ? 'true' : null"
			[attr.data-matches-spartan-invalid]="_spartanInvalid() ? 'true' : null"
			(click)="_handleClick(); readonly() && _popover().open()"
			(keydown.arrowDown)="_open()"
			(keydown.enter)="_handleEnter($event); readonly() && _popover().open()"
			(keydown.space)="readonly() && _popover().open()"
			(input)="_handleInputChange($event)"
			(focus)="_handleFocus()"
			(blur)="_handleBlur()"
		/>
		<hlm-input-group-addon align="inline-end">
			@if (_showClearButton() && !readonly()) {
				<button
					hlmInputGroupButton
					size="icon-xs"
					variant="ghost"
					[attr.aria-label]="clearAriaLabel()"
					(click)="_clear()"
					[disabled]="_disabled()"
				>
					<ng-icon name="lucideX" />
				</button>
			}
			<button
				hlmInputGroupButton
				size="icon-xs"
				[attr.aria-label]="calendarAriaLabel()"
				(click)="_popover().open()"
				[disabled]="_disabled()"
			>
				<ng-icon name="lucideCalendar" />
			</button>
		</hlm-input-group-addon>
	`,
})
export class HlmDatePickerInput<T> extends BrnDateInput<T> implements BrnDatePickerTriggerBase {
	private readonly _config = injectHlmDatePickerConfig<T>();
	private readonly _fieldControl = inject(BrnFieldControl, { optional: true });

	/** When true, typing is blocked but the calendar toggle still works. */
	public readonly readonly = input<boolean, BooleanInput>(false, { transform: booleanAttribute });

	private readonly _invalid = this._fieldControl?.invalid;
	protected readonly _spartanInvalid = computed(
		() => this.forceInvalid() || this._fieldControl?.spartanInvalid(),
	);
	protected readonly _dirty = this._fieldControl?.dirty;
	protected readonly _touched = this._fieldControl?.touched;

	protected readonly _ariaInvalid = computed(() => (this._invalid?.() ? 'true' : null));

	/**
	 * Parses input text into a date value. Return `null` for invalid
	 * input - the picker's date is cleared while the text is preserved so
	 * the user can fix it.
	 *
	 * Defaults to `parseDate` from `HlmDatePickerConfig`.
	 */
	public readonly parseDate = input<(value: string) => T | null>(this._config.parseDate);

	/**
	 * Formats the current date into the input/edit format shown while the
	 * input is focused. On blur the picker's display format is restored.
	 *
	 * Defaults to `formatInputDate` from `HlmDatePickerConfig`.
	 */
	public readonly formatInputDate = input<(date: T) => string>(this._config.formatInputDate);

	protected parseValue(value: string): T | null {
		return this.parseDate()(value);
	}

	protected formatInputValue(value: T): string {
		return this.formatInputDate()(value);
	}
}
