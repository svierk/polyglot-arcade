/**
 * Copyright (c) 2026, Salesforce, Inc.,
 * All rights reserved.
 * For full license text, see the LICENSE.txt file
 */
import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { Router, RouterLink, RouterLinkActive, RouterOutlet, type Route } from "@angular/router";
import { AgentforceConversationClientComponent } from "../../../features/agentforce/conversation";

interface NavItem {
	path: string;
	label: string;
}

/**
 * App-owned layout — overrides the base `app-layout` at compose (app copy wins).
 * Angular analogue of the React internal app's `appLayout.tsx`: renders the
 * floating Agentforce client after the outlet, and derives nav from the merged
 * router config (routes with `data.showInNavigation`).
 */
@Component({
	selector: "app-layout",
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [RouterOutlet, RouterLink, RouterLinkActive, AgentforceConversationClientComponent],
	templateUrl: "./app-layout.html",
})
export class AppLayoutComponent {
	private readonly router = inject(Router);

	readonly isOpen = signal(false);

	/** Routes flagged `data.showInNavigation` with a label, flattened. */
	readonly navigationItems = computed<NavItem[]>(() =>
		this.collectNavItems(this.router.config, ""),
	);

	private collectNavItems(routes: Route[], parentPath: string): NavItem[] {
		const items: NavItem[] = [];
		for (const route of routes) {
			const segment = route.path ?? "";
			const fullPath =
				segment === ""
					? parentPath || "/"
					: parentPath === "/" || parentPath === ""
						? `/${segment}`
						: `${parentPath}/${segment}`;

			const data = route.data as { showInNavigation?: boolean; label?: string } | undefined;
			if (data?.showInNavigation === true && data.label) {
				items.push({ path: fullPath, label: data.label });
			}

			if (route.children?.length) {
				items.push(...this.collectNavItems(route.children, fullPath));
			}
		}
		return items;
	}

	toggleMenu(): void {
		this.isOpen.update((v) => !v);
	}

	closeMenu(): void {
		this.isOpen.set(false);
	}
}
