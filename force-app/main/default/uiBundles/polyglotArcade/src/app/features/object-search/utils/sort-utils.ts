/**
 * Copyright (c) 2026, Salesforce, Inc.,
 * All rights reserved.
 * For full license text, see the LICENSE.txt file
 */

import { ResultOrder, NullOrder } from "../../../api/graphql-operations-types";

export interface SortFieldConfig<TFieldName extends string = string> {
	field: TFieldName;
	label: string;
}

export interface SortState<TFieldName extends string = string> {
	field: TFieldName;
	direction: "ASC" | "DESC";
}

/**
 * Converts a {@link SortState} into a GraphQL order-by object.
 *
 * @typeParam TOrderBy - The GraphQL order-by input type (e.g. `Account_OrderBy`).
 * @param sort - The current sort state from the UI, or `null` if no sort is applied.
 * @returns An order-by object for the query's `orderBy` variable, or `undefined`
 *          when no sort is active (defers to the API's default ordering).
 *
 * @example
 * buildOrderBy({ field: 'Name', direction: 'ASC' })
 * // => { Name: { order: 'ASC', nulls: 'LAST' } }
 */
export function buildOrderBy<TOrderBy>(sort: SortState | null): TOrderBy | undefined {
	if (!sort) return undefined;
	return {
		[sort.field]: {
			order: sort.direction === "ASC" ? ResultOrder.Asc : ResultOrder.Desc,
			nulls: NullOrder.Last,
		},
	} as TOrderBy;
}
