/**
 * Copyright (c) 2026, Salesforce, Inc.,
 * All rights reserved.
 * For full license text, see the LICENSE.txt file
 */
export const SEARCH_ACCOUNTS = /* GraphQL */ `
	query SearchAccounts(
		$first: Int
		$after: String
		$where: Account_Filter
		$orderBy: Account_OrderBy
	) {
		uiapi {
			query {
				Account(first: $first, after: $after, where: $where, orderBy: $orderBy) {
					edges {
						node {
							Id
							Name @optional {
								value
								displayValue
							}
							Industry @optional {
								value
								displayValue
							}
							Type @optional {
								value
								displayValue
							}
							Phone @optional {
								value
								displayValue
							}
							Owner @optional {
								Name @optional {
									value
									displayValue
								}
							}
							AnnualRevenue @optional {
								value
								displayValue
							}
						}
					}
					pageInfo {
						hasNextPage
						hasPreviousPage
						endCursor
						startCursor
					}
					totalCount
				}
			}
		}
	}
`;
