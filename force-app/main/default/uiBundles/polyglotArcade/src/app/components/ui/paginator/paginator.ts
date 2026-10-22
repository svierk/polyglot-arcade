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
  output,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideChevronFirst,
  lucideChevronLast,
  lucideChevronLeft,
  lucideChevronRight,
} from '@ng-icons/lucide';
import { HlmPaginationImports } from '@spartan-ng/styles/pagination';
import type { PageEvent } from './types';

export type { PageEvent } from './types';

@Component({
  selector: 'app-paginator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmPaginationImports, NgIcon],
  providers: [
    provideIcons({ lucideChevronFirst, lucideChevronLast, lucideChevronLeft, lucideChevronRight }),
  ],
  host: { class: 'flex items-center justify-end gap-4 text-sm' },
  templateUrl: './paginator.html',
})
export class PaginatorComponent {
  readonly length = input<number>(0);
  readonly pageIndex = model<number>(0);
  readonly pageSize = model<number>(10);
  readonly pageSizeOptions = input<readonly number[]>([]);
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly hidePageSize = input(false, { transform: booleanAttribute });
  readonly showFirstLastButtons = input(false, { transform: booleanAttribute });
  readonly page = output<PageEvent>();

  private static _uid = 0;
  // Unique so the label→select association survives multiple paginators on a page.
  protected readonly pageSizeLabelId = `app-paginator-page-size-${PaginatorComponent._uid++}`;

  protected readonly lastPage = computed(() =>
    Math.max(0, Math.ceil(this.length() / this.pageSize()) - 1),
  );

  protected readonly clampedPageIndex = computed(() =>
    Math.max(0, Math.min(this.pageIndex(), this.lastPage())),
  );

  protected readonly rangeLabel = computed(() => {
    const len = this.length();
    if (len === 0) return '0 of 0';
    const idx = this.clampedPageIndex();
    const start = idx * this.pageSize() + 1;
    const end = Math.min((idx + 1) * this.pageSize(), len);
    return `${start} – ${end} of ${len}`;
  });

  protected goToPage(index: number): void {
    const previousPageIndex = this.pageIndex();
    this.pageIndex.set(index);
    this.page.emit({
      pageIndex: index,
      previousPageIndex,
      pageSize: this.pageSize(),
      length: this.length(),
    });
  }

  protected onPageSizeChange(event: Event): void {
    const newSize = Number((event.target as HTMLSelectElement).value);
    const previousPageIndex = this.pageIndex();
    this.pageSize.set(newSize);
    this.pageIndex.set(0);
    this.page.emit({
      pageIndex: 0,
      previousPageIndex,
      pageSize: newSize,
      length: this.length(),
    });
  }
}

export const PaginatorImports = [PaginatorComponent] as const;
