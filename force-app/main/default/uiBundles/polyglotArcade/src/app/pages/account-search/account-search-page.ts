/**
 * Copyright (c) 2026, Salesforce, Inc.,
 * All rights reserved.
 * For full license text, see the LICENSE.txt file
 */
import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { AlertComponent } from "../../components/ui/alert/alert";
import { IconComponent } from "../../components/ui/icon/icon";
import { CollapsibleComponent } from "../../components/ui/collapsible/collapsible";
import { SkeletonComponent } from "../../components/ui/skeleton/skeleton";
import { ObjectBreadcrumbComponent } from "../../features/object-search/breadcrumb/breadcrumb";
import { SortControlComponent } from "../../features/object-search/sort-control/sort-control";
import { ActiveFiltersComponent } from "../../features/object-search/filters/active-filters";
import { PaginationControlsComponent } from "../../features/object-search/pagination/pagination";
import { SearchFilterComponent } from "../../features/object-search/filters/search-filter";
import { TextFilterComponent } from "../../features/object-search/filters/text-filter";
import { SelectFilterComponent } from "../../features/object-search/filters/select-filter";
import { MultiSelectFilterComponent } from "../../features/object-search/filters/multi-select-filter";
import { NumericRangeFilterComponent } from "../../features/object-search/filters/numeric-range-filter";
import { DateFilterComponent } from "../../features/object-search/filters/date-filter";
import { DateRangeFilterComponent } from "../../features/object-search/filters/date-range-filter";
import {
	ObjectSearchStateService,
	type PaginationConfig,
} from "../../features/object-search/object-search-state.service";
import { createAsyncData } from "../../utils/async-data";
import { fieldValue } from "../../features/object-search/utils/field-utils";
import type { FilterFieldConfig } from "../../features/object-search/utils/filter-utils";
import type { SortFieldConfig } from "../../features/object-search/utils/sort-utils";
import {
	AccountSearchService,
	type AccountSearchNode,
	type AccountSearchOptions,
} from "../../api/account/account-search.service";

const PAGINATION_CONFIG: PaginationConfig = {
	defaultPageSize: 7,
	validPageSizes: [7, 14, 28, 42],
};

// Single source of truth for URL (de)serialization and GraphQL `where`
// building. Picklist options for Industry / Type are filled in at runtime
// (see the component's computed configs) from the distinct-value queries.
const FILTER_CONFIGS: FilterFieldConfig[] = [
	{
		field: "search",
		label: "Search",
		type: "search",
		searchFields: ["Name", "Phone", "Industry"],
		placeholder: "Search by name, phone, or industry...",
	},
	{ field: "Name", label: "Account Name", type: "text", placeholder: "Search by name..." },
	{ field: "Industry", label: "Industry", type: "picklist" },
	{ field: "Type", label: "Type", type: "multipicklist" },
	{ field: "AnnualRevenue", label: "Annual Revenue", type: "numeric" },
	{ field: "CreatedDate", label: "Created Date", type: "datetime", disableFuture: true },
	{
		field: "LastModifiedDate",
		label: "Last Modified Date",
		type: "datetimerange",
		disableFuture: true,
	},
];

const ACCOUNT_SORT_CONFIGS: SortFieldConfig[] = [
	{ field: "Name", label: "Name" },
	{ field: "AnnualRevenue", label: "Annual Revenue" },
	{ field: "Industry", label: "Industry" },
	{ field: "CreatedDate", label: "Created Date" },
];

// State lives in a page-scoped ObjectSearchStateService (provided here, NOT
// in root) so each search page owns its own filters / sort / cursor stack;
// the filter components projected into the sidebar inject that same instance.
@Component({
	selector: "app-account-search-page",
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [ObjectSearchStateService],
	imports: [
		RouterLink,
		AlertComponent,
		IconComponent,
		CollapsibleComponent,
		SkeletonComponent,
		ObjectBreadcrumbComponent,
		SortControlComponent,
		ActiveFiltersComponent,
		PaginationControlsComponent,
		SearchFilterComponent,
		TextFilterComponent,
		SelectFilterComponent,
		MultiSelectFilterComponent,
		NumericRangeFilterComponent,
		DateFilterComponent,
		DateRangeFilterComponent,
	],
	templateUrl: "./account-search-page.html",
})
export class AccountSearchPageComponent {
	private readonly service = inject(AccountSearchService);
	private readonly state = inject(ObjectSearchStateService);

	protected readonly sortConfigs = ACCOUNT_SORT_CONFIGS;
	protected readonly pageSizeOptions = PAGINATION_CONFIG.validPageSizes;

	protected readonly filtersOpen = signal<boolean>(true);

	private readonly query = this.state.init<
		AccountSearchOptions["where"],
		AccountSearchOptions["orderBy"]
	>(FILTER_CONFIGS, PAGINATION_CONFIG);

	protected readonly pageSize = this.state.pageSize;
	protected readonly hasPreviousPage = this.state.hasPreviousPage;

	// -- Distinct-value option loads (Industry / Type filters) -----------------
	private readonly industries = createAsyncData(signal(0), () =>
		this.service.fetchDistinctIndustries(),
	);
	private readonly types = createAsyncData(signal(0), () => this.service.fetchDistinctTypes());

	// -- Per-filter configs (options merged in for the picklist filters) -------
	protected readonly searchConfig = FILTER_CONFIGS[0];
	protected readonly nameConfig = FILTER_CONFIGS[1];
	protected readonly revenueConfig = FILTER_CONFIGS[4];
	protected readonly createdConfig = FILTER_CONFIGS[5];
	protected readonly lastModifiedConfig = FILTER_CONFIGS[6];
	protected readonly industryConfig = computed<FilterFieldConfig>(() => ({
		...FILTER_CONFIGS[2],
		options: this.industries.data() ?? [],
	}));
	protected readonly typeConfig = computed<FilterFieldConfig>(() => ({
		...FILTER_CONFIGS[3],
		options: this.types.data() ?? [],
	}));

	// -- Search results --------------------------------------------------------
	private readonly searchArgs = computed(() => ({
		where: this.query.where(),
		orderBy: this.query.orderBy(),
		first: this.state.pageSize(),
		after: this.state.afterCursor(),
	}));
	private readonly result = createAsyncData(this.searchArgs, (args) =>
		this.service.searchAccounts(args),
	);

	protected readonly loading = this.result.loading;
	protected readonly error = this.result.error;

	private readonly pageInfo = computed(() => this.result.data()?.pageInfo);
	protected readonly totalCount = computed(() => this.result.data()?.totalCount);
	protected readonly hasNextPage = computed(() => this.pageInfo()?.hasNextPage ?? false);
	protected readonly endCursor = computed(() => this.pageInfo()?.endCursor ?? undefined);

	protected readonly nodes = computed<AccountSearchNode[]>(() => {
		const edges = this.result.data()?.edges ?? [];
		const out: AccountSearchNode[] = [];
		for (const edge of edges) {
			if (edge?.node) out.push(edge.node);
		}
		return out;
	});

	protected readonly controlsDisabled = computed(() => this.loading() || !!this.error());

	protected readonly skeletonRows = computed(() =>
		Array.from({ length: this.pageSize() }, (_, i) => i),
	);

	protected readonly resultCountLabel = computed(() => {
		const total = this.totalCount();
		const shown = this.nodes().length;
		if (total != null && (this.hasNextPage() || this.hasPreviousPage())) {
			return `${total} account${total !== 1 ? "s" : ""} found`;
		}
		return `Showing ${shown} account${shown !== 1 ? "s" : ""}`;
	});

	protected name(node: AccountSearchNode): string {
		return fieldValue(node.Name) ?? "—";
	}

	protected secondaryLine(node: AccountSearchNode): string {
		return [fieldValue(node.Industry), fieldValue(node.Type)].filter(Boolean).join(" · ") || "—";
	}

	protected phone(node: AccountSearchNode): string {
		return fieldValue(node.Phone) ?? "";
	}

	protected ownerName(node: AccountSearchNode): string {
		return fieldValue(node.Owner?.Name) ?? "";
	}
}
