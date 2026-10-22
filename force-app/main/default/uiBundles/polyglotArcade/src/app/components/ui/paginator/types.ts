/**
 * Copyright (c) 2026, Salesforce, Inc.,
 * All rights reserved.
 * For full license text, see the LICENSE.txt file
 */

/** Payload emitted by PaginatorComponent's `(page)` output. */
export interface PageEvent {
	pageIndex: number;
	previousPageIndex: number;
	pageSize: number;
	length: number;
}
