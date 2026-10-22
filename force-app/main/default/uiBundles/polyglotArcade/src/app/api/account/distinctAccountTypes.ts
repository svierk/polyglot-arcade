/**
 * Copyright (c) 2026, Salesforce, Inc.,
 * All rights reserved.
 * For full license text, see the LICENSE.txt file
 */
export const DISTINCT_ACCOUNT_TYPES = /* GraphQL */ `
	query DistinctAccountTypes {
		uiapi {
			aggregate {
				Account(groupBy: { Type: { group: true } }) {
					edges {
						node {
							aggregate @optional {
								Type @optional {
									value
									displayValue
									label
								}
							}
						}
					}
				}
			}
		}
	}
`;
