/**
 * Copyright (c) 2026, Salesforce, Inc.,
 * All rights reserved.
 * For full license text, see the LICENSE.txt file
 */
import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";
import { RouterLink } from "@angular/router";
import { IconComponent } from "../../../components/ui/icon/icon";
import { SkeletonComponent } from "../../../components/ui/skeleton/skeleton";

/** Object-search breadcrumb — Home > Records list > (optional) Record name. */
@Component({
	selector: "app-object-breadcrumb",
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [RouterLink, IconComponent, SkeletonComponent],
	templateUrl: "./breadcrumb.html",
})
export class ObjectBreadcrumbComponent {
	readonly listPath = input.required<string>();
	readonly listLabel = input.required<string>();
	readonly recordName = input<string | undefined>(undefined);
	readonly loading = input<boolean>(false);
	readonly includeHome = input<boolean>(true);
	readonly homeLabel = input<string>("Home");

	protected readonly isDetailView = computed(() => this.loading() || !!this.recordName());
}
