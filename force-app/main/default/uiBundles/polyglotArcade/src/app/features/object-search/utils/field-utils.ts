/**
 * Copyright (c) 2026, Salesforce, Inc.,
 * All rights reserved.
 * For full license text, see the LICENSE.txt file
 */

/** A Salesforce GraphQL scalar field: `{ value, displayValue }`. */
export interface UiField {
	displayValue?: string | null;
	value?: unknown;
}

/**
 * Extracts a human-readable string from a Salesforce GraphQL scalar field,
 * preferring the server-formatted `displayValue` over the raw `value`.
 *
 * @returns The display string, or `null` when the field is empty.
 */
export function fieldValue(field: UiField | null | undefined): string | null {
	if (field?.displayValue != null) return field.displayValue;
	if (field?.value != null) return String(field.value);
	return null;
}

/**
 * Formats a Salesforce address into display lines (street / city-state-zip /
 * country), omitting empty parts. Returns `null` when nothing is present.
 */
export function getAddressFieldLines(address: {
	street?: string | null;
	city?: string | null;
	state?: string | null;
	postalCode?: string | null;
	country?: string | null;
}): string[] | null {
	const cityStateZip = [address.city, address.state].filter(Boolean).join(", ");
	const cityStateZipLine = [cityStateZip, address.postalCode].filter(Boolean).join(" ");
	const lines = [address.street, cityStateZipLine, address.country].filter(Boolean) as string[];
	if (lines.length === 0) return null;
	return lines;
}

/**
 * Formats an ISO datetime string via `Intl`/`toLocaleString`. Returns `null`
 * for empty input so callers can fall back cleanly.
 */
export function formatDateTimeField(
	value: string | null | undefined,
	locales?: Intl.LocalesArgument,
	options?: Intl.DateTimeFormatOptions,
): string | null {
	if (!value) return null;
	return new Date(value).toLocaleString(locales, options);
}
