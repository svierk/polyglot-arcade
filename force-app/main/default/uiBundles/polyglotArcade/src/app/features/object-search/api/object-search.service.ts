/**
 * Copyright (c) 2026, Salesforce, Inc.,
 * All rights reserved.
 * For full license text, see the LICENSE.txt file
 */
import { Injectable, inject } from "@angular/core";
import { DataClient } from "../../../api/data-client.service";

/** Search args */
export interface ObjectSearchOptions<TWhere, TOrderBy> {
	where?: TWhere;
	orderBy?: TOrderBy;
	first?: number;
	after?: string;
}

/** Picklist option shape shared with filter components. */
export type PicklistOption = { value: string; label: string };

/**
 * Generic object-search data service
 *
 * Provides reusable, object-agnostic methods for:
 * - Searching objects via GraphQL `uiapi.query.<ObjectName>`
 * - Fetching distinct picklist values via `uiapi.aggregate.<ObjectName>`
 *
 * Domain-specific services (e.g. `AccountSearchService`) delegate here with
 * typed parameters rather than reimplementing the query/extraction logic.
 */
@Injectable({ providedIn: "root" })
export class ObjectSearchService {
	private readonly client = inject(DataClient);

	/**
	 * Executes a GraphQL search query and extracts the result for the given
	 * object name from the standard `uiapi.query.<ObjectName>` response shape.
	 */
	async searchObjects<TResult, TQuery, TVariables>(
		query: string,
		objectName: string,
		options: ObjectSearchOptions<unknown, unknown> = {},
	): Promise<TResult> {
		const { where, orderBy, first = 20, after } = options;
		const data = await this.client.execute<TQuery, TVariables>(query, {
			first,
			after,
			where,
			orderBy,
		} as TVariables);

		const uiapi = (data as Record<string, unknown>)?.["uiapi"] as
			| Record<string, unknown>
			| undefined;
		const queryResult = (uiapi?.["query"] as Record<string, unknown> | undefined)?.[objectName] as
			| TResult
			| undefined;

		if (!queryResult) {
			throw new Error(`No ${objectName} data returned`);
		}
		return queryResult;
	}

	/**
	 * Executes a GraphQL aggregate/groupBy query and extracts picklist options
	 * from the standard `uiapi.aggregate.<ObjectName>` response shape.
	 */
	async fetchDistinctValues<TQuery>(
		query: string,
		objectName: string,
		fieldName: string,
	): Promise<PicklistOption[]> {
		const data = await this.client.execute<TQuery>(query);

		const uiapi = (data as Record<string, unknown>)?.["uiapi"] as
			| Record<string, unknown>
			| undefined;
		const aggregate = (uiapi?.["aggregate"] as Record<string, unknown> | undefined)?.[
			objectName
		] as { edges?: Array<{ node?: { aggregate?: Record<string, unknown> } }> } | undefined;

		const edges = aggregate?.edges ?? [];
		return edges
			.map((edge) => {
				const field = edge?.node?.aggregate?.[fieldName] as
					| { value?: string | null; displayValue?: string | null; label?: string | null }
					| undefined;
				const value = field?.value;
				if (!value) return null;
				return { value, label: field.label ?? field.displayValue ?? value };
			})
			.filter((opt): opt is PicklistOption => opt !== null);
	}
}
