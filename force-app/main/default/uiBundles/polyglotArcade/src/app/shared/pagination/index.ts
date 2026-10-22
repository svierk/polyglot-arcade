import { HlmNumberedPagination } from './hlm-numbered-pagination';
import { HlmNumberedPaginationQueryParams } from './hlm-numbered-pagination-query-params';
import { HlmPagination } from './hlm-pagination';
import { HlmPaginationContent } from './hlm-pagination-content';
import { HlmPaginationEllipsis } from './hlm-pagination-ellipsis';
import { HlmPaginationItem } from './hlm-pagination-item';
import { HlmPaginationLink } from './hlm-pagination-link';
import { HlmPaginationNext } from './hlm-pagination-next';
import { HlmPaginationPrevious } from './hlm-pagination-previous';

export * from './hlm-numbered-pagination';
export * from './hlm-numbered-pagination-query-params';
export * from './hlm-pagination';
export * from './hlm-pagination-content';
export * from './hlm-pagination-ellipsis';
export * from './hlm-pagination-item';
export * from './hlm-pagination-link';
export * from './hlm-pagination-next';
export * from './hlm-pagination-previous';

export const HlmPaginationImports = [
	HlmPagination,
	HlmPaginationContent,
	HlmPaginationItem,
	HlmPaginationLink,
	HlmPaginationPrevious,
	HlmPaginationNext,
	HlmPaginationEllipsis,
	HlmNumberedPagination,
	HlmNumberedPaginationQueryParams,
] as const;
