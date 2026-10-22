/**
 * Copyright (c) 2026, Salesforce, Inc.,
 * All rights reserved.
 * For full license text, see the LICENSE.txt file
 */
export const DISTINCT_ACCOUNT_INDUSTRIES = /* GraphQL */ `
	query DistinctAccountIndustries {
		uiapi {
			aggregate {
				Account(groupBy: { Industry: { group: true } }) {
					edges {
						node {
							aggregate @optional {
								Industry @optional {
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
