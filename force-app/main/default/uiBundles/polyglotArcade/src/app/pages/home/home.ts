/**
 * Copyright (c) 2026, Salesforce, Inc.,
 * All rights reserved.
 * For full license text, see the LICENSE.txt file
 */
import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { Router } from "@angular/router";
// Base-app UI wrappers, inherited (not recreated) by this feature. Post-compose
// they land at uiBundles/<target>/src/app/components/ui/{button,input}/..., three levels
// up from this page folder (app/pages/home/ -> app/components/ui/).
import { ButtonComponent } from "../../components/ui/button/button";
import { SearchBarComponent } from "../../features/object-search/search-bar/search-bar";

/**
 * Account-search landing page. Mirrors the React `Home` page: a single search
 * box plus a "Browse All Accounts" shortcut. Submitting navigates to the
 * `accounts` list, carrying the typed term as the `q` query param so the search
 * page's {@link ObjectSearchStateService} seeds the multi-field search filter.
 *
 * Named `HomeComponent` (selector `app-home`) so it overwrites the base app's
 * placeholder home at compose, leaving the composed app with a single `home`
 * component.
 *
 * Uses the presentational `app-search-bar` (icon + input) with its own local
 * `term` signal and submit-to-navigate flow — Home has no shared search state;
 * it just seeds `?q=` and routes into the search page.
 */
@Component({
	selector: "app-home",
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [ButtonComponent, SearchBarComponent],
	templateUrl: "./home.html",
})
export class HomeComponent {
	private readonly router = inject(Router);

	/** Minimum characters required before a search can be submitted. */
	private static readonly MIN_SEARCH_LENGTH = 3;

	/** Bound to the search input; forwarded as `?q=` on submit. */
	protected readonly term = signal<string>("");

	/** True once the trimmed term meets the minimum length — gates the Search button. */
	protected readonly canSearch = computed(
		() => this.term().trim().length >= HomeComponent.MIN_SEARCH_LENGTH,
	);

	/**
	 * Navigate to the search page, seeding the search term. No-op unless the
	 * trimmed term meets the minimum length (covers both the button click and the
	 * Enter/submit path).
	 */
	protected onSubmit(event: Event): void {
		event.preventDefault();
		if (!this.canSearch()) return;
		this.browseAll(this.term().trim());
	}

	/** Go to the accounts list, optionally with a seeded search term. */
	protected browseAll(q?: string): void {
		void this.router.navigate(["/accounts"], {
			queryParams: q ? { q } : {},
		});
	}
}
