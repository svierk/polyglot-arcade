/**
 * Copyright (c) 2026, Salesforce, Inc.,
 * All rights reserved.
 * For full license text, see the LICENSE.txt file
 */
import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  input,
  model,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { HlmDatePickerImports } from '@spartan-ng/styles/date-picker';
import type { AppFieldSize } from '../field-size';

export interface DateRange<D> {
  start: D | null;
  end: D | null;
}

@Component({
  selector: 'app-date-range-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmDatePickerImports, NgClass],
  host: { class: 'block min-w-0' },
  templateUrl: './date-range-picker.html',
})
export class DateRangePickerComponent {
  readonly value = model<DateRange<Date> | null>(null);
  readonly label = input<string>('');
  readonly startPlaceholder = input<string>('Start');
  readonly endPlaceholder = input<string>('End');
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly readonly = input(false, { transform: booleanAttribute });
  readonly size = input<AppFieldSize>('default');
  readonly min = input<Date | null>(null);
  readonly max = input<Date | null>(null);

  private static _uid = 0;
  protected readonly labelId = `app-date-range-picker-${DateRangePickerComponent._uid++}`;

  protected readonly wrapperClasses = computed(() => {
    const cls: string[] = [];
    const s = this.size();
    if (s === 'sm')
      cls.push('[&_[data-slot=input-group]]:h-6', '[&_[data-slot=input-group]]:text-xs');
    if (s === 'lg')
      cls.push('[&_[data-slot=input-group]]:h-10', '[&_[data-slot=input-group]]:text-lg');
    return cls;
  });

  protected dateRange(): [Date, Date] | undefined {
    const v = this.value();
    if (v?.start && v?.end) return [v.start, v.end];
    return undefined;
  }

  protected onRangeChange(range: [Date | null, Date | null] | null): void {
    if (!range) {
      this.value.set(null);
      return;
    }
    this.value.set({ start: range[0], end: range[1] });
  }
}

export const DateRangePickerImports = [DateRangePickerComponent] as const;
