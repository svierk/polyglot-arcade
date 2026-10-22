/**
 * Copyright (c) 2026, Salesforce, Inc.,
 * All rights reserved.
 * For full license text, see the LICENSE.txt file
 */
import { Injectable, inject } from "@angular/core";
// DataClient is provided by the base-angular-app. Consumed via the
// `__inherit__` stub one level up (app/api/account/ -> app/api/); post-compose
// patches-cli strips the prefix so it resolves to the seeded base file at
// app/api/data-client.service.ts.
import { DataClient } from "../data-client.service";
// Query constants are owned by this feature (sibling files) so object-search
// is self-contained — no external GraphQL dependency.
import { SEARCH_ACCOUNTS } from "./searchAccounts";
import { GET_ACCOUNT_DETAIL } from "./getAccountDetail";
import { DISTINCT_ACCOUNT_INDUSTRIES } from "./distinctAccountIndustries";
import { DISTINCT_ACCOUNT_TYPES } from "./distinctAccountTypes";

import type {
	SearchAccountsQuery,
	SearchAccountsQueryVariables,
	GetAccountDetailQuery,
	DistinctAccountIndustriesQuery,
	DistinctAccountTypesQuery,
} from "../graphql-operations-types";

import {
	ObjectSearchService,
	type PicklistOption,
	type ObjectSearchOptions,
} from "../../features/object-search/api/object-search.service";

// ---------------------------------------------------------------------------
// Derived type aliases — replace the previously hand-written interfaces with
// types extracted from the generated GraphQL operations
// ---------------------------------------------------------------------------

export type AccountSearchResult = NonNullable<SearchAccountsQuery["uiapi"]["query"]["Account"]>;

export type AccountSearchNode = NonNullable<
	NonNullable<NonNullable<AccountSearchResult["edges"]>[number]>["node"]
>;

export type AccountDetailResult = NonNullable<GetAccountDetailQuery["uiapi"]["query"]["Account"]>;

export type AccountDetailNode = NonNullable<
	NonNullable<NonNullable<AccountDetailResult["edges"]>[number]>["node"]
>;

export type AccountSearchOptions = ObjectSearchOptions<
	SearchAccountsQueryVariables["where"],
	SearchAccountsQueryVariables["orderBy"]
>;

export type { PicklistOption };

/**
 * Angular account-search data service.
 *
 * Wraps `ObjectSearchService` for search/aggregate queries and `DataClient`
 * directly for the detail query (which takes an `id` variable rather than
 * search options). Provided in root; the service is stateless (all state lives
 * in `ObjectSearchStateService` per-page).
 *
 * Mirrors the React `accountSearchService` module — the shape of the returned
 * data is identical so the templates can be a straight JSX-to-Angular port.
 */
@Injectable({ providedIn: "root" })
export class AccountSearchService {
	private readonly client = inject(DataClient);
	private readonly objectSearch = inject(ObjectSearchService);

	/** Runs the search query and returns the `Account` connection. */
	async searchAccounts(args: AccountSearchOptions = {}): Promise<AccountSearchResult> {
		return this.objectSearch.searchObjects<
			AccountSearchResult,
			SearchAccountsQuery,
			SearchAccountsQueryVariables
		>(SEARCH_ACCOUNTS, "Account", args);
	}

	/** Fetches a single Account by Id; returns `null` if not found. */
	async getAccountDetail(id: string): Promise<AccountDetailNode | null> {
		const data = await this.client.execute<GetAccountDetailQuery, { id: string }>(
			GET_ACCOUNT_DETAIL,
			{ id },
		);
		return data.uiapi.query.Account?.edges?.[0]?.node ?? null;
	}

	/** Distinct `Industry` values for the picklist filter. */
	async fetchDistinctIndustries(): Promise<PicklistOption[]> {
		return this.objectSearch.fetchDistinctValues<DistinctAccountIndustriesQuery>(
			DISTINCT_ACCOUNT_INDUSTRIES,
			"Account",
			"Industry",
		);
	}

	/** Distinct `Type` values for the multipicklist filter. */
	async fetchDistinctTypes(): Promise<PicklistOption[]> {
		return this.objectSearch.fetchDistinctValues<DistinctAccountTypesQuery>(
			DISTINCT_ACCOUNT_TYPES,
			"Account",
			"Type",
		);
	}
}
