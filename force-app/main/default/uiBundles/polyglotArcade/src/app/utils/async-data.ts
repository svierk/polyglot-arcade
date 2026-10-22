/**
 * Copyright (c) 2026, Salesforce, Inc.,
 * All rights reserved.
 * For full license text, see the LICENSE.txt file
 */
import { effect, Injector, signal, type Signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { from, of, switchMap } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

/** Reactive async-data snapshot: current data, loading, and error. */
export interface AsyncData<T> {
	/** Latest successful result. Kept visible during a refetch. */
	readonly data: Signal<T | null>;
	/** True while a fetch for the current args is in flight. */
	readonly loading: Signal<boolean>;
	/** Error message from the most recent failed fetch, else null. */
	readonly error: Signal<string | null>;
}

/**
 * The Angular analogue of the React `useAsyncData` hook.
 *
 * Re-runs `fetcher(args)` whenever the `args` signal changes, using RxJS
 * `switchMap` so an in-flight request is cancelled (ignored) when newer args
 * arrive — the latest-wins guarantee, matching the React hook's cleanup flag.
 *
 * Behavioural parity notes:
 * - `loading` flips true the instant args change and false when the matching
 *   response resolves.
 * - `data` retains the previous result while a refetch is in flight (avoids a
 *   flash of empty state); it only resets to `null` on error.
 * - Errors are surfaced as a message string and logged, mirroring the hook.
 *
 * Must be called within an injection context (component/service constructor or
 * field initializer) unless an `injector` is supplied.
 *
 * @param argsSignal - Reactive inputs; a change triggers a refetch.
 * @param fetcher    - Async function producing the result for the given args.
 * @param injector   - Optional injector when called outside an injection context.
 */
export function createAsyncData<TArgs, T>(
	argsSignal: Signal<TArgs>,
	fetcher: (args: TArgs) => Promise<T>,
	injector?: Injector,
): AsyncData<T> {
	const data = signal<T | null>(null);
	const error = signal<string | null>(null);
	// A fetch is pending from the moment args change until its response lands.
	const pending = signal(true);

	const args$ = toObservable(argsSignal, injector ? { injector } : undefined);

	const result = toSignal(
		args$.pipe(
			// Mark loading + clear stale error synchronously as new args arrive.
			tap(() => {
				pending.set(true);
				error.set(null);
			}),
			switchMap((args) =>
				from(fetcher(args)).pipe(
					map((value) => ({ value, err: null as string | null })),
					catchError((err: unknown) => {
						console.error(err);
						return of({
							value: null as T | null,
							err: err instanceof Error ? err.message : 'An error occurred',
						});
					}),
				),
			),
			tap((outcome) => {
				if (outcome.err !== null) {
					error.set(outcome.err);
					data.set(null);
				} else {
					data.set(outcome.value);
				}
				pending.set(false);
			}),
		),
		{ initialValue: null, ...(injector ? { injector } : {}) },
	);

	// Keep `result` subscribed so the pipeline runs even if no template reads it.
	effect(
		() => {
			result();
		},
		injector ? { injector } : undefined,
	);

	return {
		data: data.asReadonly(),
		loading: pending.asReadonly(),
		error: error.asReadonly(),
	};
}
