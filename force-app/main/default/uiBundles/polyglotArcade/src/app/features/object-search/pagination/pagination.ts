/**
 * Copyright (c) 2026, Salesforce, Inc.,
 * All rights reserved.
 * For full license text, see the LICENSE.txt file
 */
import { ChangeDetectionStrategy, Component, inject, input } from "@angular/core";
import { PaginatorComponent } from "../../../components/ui/paginator/paginator";
import type { PageEvent } from "../../../components/ui/paginator/types";
import { ObjectSearchStateService } from "../object-search-state.service";

/**
 * Cursor-pagination bridge. Feeds shared cursor state into {@link PaginatorComponent}
 * and translates its offset-style `(page)` event back into the cursor walk the
 * state service understands.
 */
@Component({
	selector: "app-pagination-controls",
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [PaginatorComponent],
	templateUrl: "./pagination.html",
})
export class PaginationControlsComponent {
	readonly totalCount = input<number | undefined>(undefined);
	readonly hasNextPage = input<boolean>(false);
	readonly endCursor = input<string | undefined>(undefined);
	readonly pageSizeOptions = input.required<readonly number[]>();
	readonly disabled = input<boolean>(false);

	private readonly state = inject(ObjectSearchStateService);
	protected readonly pageIndex = this.state.pageIndex;
	protected readonly pageSize = this.state.pageSize;

	protected onPage(event: PageEvent): void {
		if (event.pageSize !== this.pageSize()) {
			this.state.setPageSize(event.pageSize);
			return;
		}
		if (event.pageIndex > this.pageIndex()) {
			const cursor = this.endCursor();
			if (cursor && this.hasNextPage()) this.state.goToNextPage(cursor);
		} else if (event.pageIndex < this.pageIndex()) {
			this.state.goToPreviousPage();
		}
	}
}
