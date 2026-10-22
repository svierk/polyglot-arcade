import { Injectable } from '@angular/core';
import { createDataSDK } from '@salesforce/platform-sdk';

/**
 * True when the operation's first definition is a `mutation`. Strips GraphQL
 * comments first so a leading `# ...` line can't mask the keyword. Queries
 * (named or anonymous `{ ... }` shorthand) and subscriptions fall through to
 * query().
 */
function isMutation(operation: string): boolean {
	return /^\s*mutation\b/.test(operation.replace(/#[^\n\r]*/g, ''));
}

/**
 * The single data-access client for the app — a thin wrapper over
 * `createDataSDK` that centralizes both of the SDK's surfaces:
 *
 * - `execute()` for GraphQL (routes mutations to `sdk.graphql.mutate` and
 *   everything else to `sdk.graphql.query`, with centralized error handling).
 *   Use with gql-tagged queries and generated operation types for type-safe
 *   calls.
 * - `fetch()` for REST (proxies `sdk.fetch`, returning the raw `Response` so
 *   callers keep full control over response parsing / error shaping).
 *
 * Consumers inject this instead of calling `createDataSDK` directly, so the SDK
 * bootstrap lives in exactly one place. Feature packages consume it via an
 * `__inherit__data-client.service` stub (base wins at compose).
 */
@Injectable({ providedIn: 'root' })
export class DataClient {
	/**
	 * Executes a GraphQL operation and returns its `data`, throwing on GraphQL
	 * errors or a null payload.
	 */
	async execute<TData, TVariables = Record<string, unknown>>(
		operation: string,
		variables?: TVariables,
	): Promise<TData> {
		const data = await createDataSDK();
		const result = isMutation(operation)
			? await data.graphql!.mutate<TData, TVariables>({
					mutation: operation,
					variables,
				})
			: await data.graphql!.query<TData, TVariables>({
					query: operation,
					variables,
				});

		if (result.errors?.length) {
			const msg = result.errors.map((e) => e.message).join('; ');
			throw new Error(`GraphQL Error: ${msg}`);
		}

		if (result.data == null) {
			throw new Error('GraphQL response data is null');
		}

		return result.data;
	}

	/**
	 * Performs a REST request through the SDK's authenticated `fetch`, returning
	 * the raw `Response`. Callers parse the body / shape errors themselves (e.g.
	 * via `handleApiResponse`).
	 *
	 * @param input - The request URL (e.g. an Apex REST route).
	 * @param init  - Standard `fetch` options (method, headers, body, …).
	 */
	async fetch(input: string, init?: RequestInit): Promise<Response> {
		const sdk = await createDataSDK();
		return sdk.fetch!(input, init);
	}
}
