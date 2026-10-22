/**
 * Copyright (c) 2026, Salesforce, Inc.,
 * All rights reserved.
 * For full license text, see the LICENSE.txt file
 */
import {
	afterNextRender,
	ChangeDetectionStrategy,
	Component,
	computed,
	ElementRef,
	inject,
	input,
	viewChild,
} from "@angular/core";
import type { AgentforceClientConfig } from "@salesforce/agentforce-conversation-client";
import type {
	AgentforceErrorHandler,
	AgentforceReadyHandler,
	StyleTokens,
} from "../../types/conversation";
import { AgentforceEmbedService } from "./agentforce-embed.service";

/**
 * Angular component that embeds the Agentforce Conversation Client (copilot /
 * agent UI) via Lightning Out. The faithful port of the React
 * `AgentforceConversationClient`: flat inputs are normalized into an
 * `AgentforceClientConfig` (a `computed()`, the analogue of the React `useMemo`)
 * and handed to {@link AgentforceEmbedService}, which owns the one-time embed
 * (the analogue of the React window-singleton).
 *
 * Rendering mode follows `inline`: inline embeds render into this component's
 * own `<div #host>`, floating embeds attach to a shared body-level host and this
 * component renders nothing. Requires a valid Salesforce session for the org;
 * config is passed through to the embed client as-is.
 */
@Component({
	selector: "app-agentforce-conversation-client",
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./conversation.html",
})
export class AgentforceConversationClientComponent {
	private readonly embedService = inject(AgentforceEmbedService);

	/** Required: id of the agent to load. */
	readonly agentId = input.required<string>();
	/** Display name for the agent shown in the chat header. */
	readonly agentLabel = input<string>();
	/** If true, renders inline. If omitted/false, renders floating. */
	readonly inline = input<boolean>(false);
	/** Show/hide chat header. Defaults to true for floating; can only be set for inline mode. */
	readonly headerEnabled = input<boolean>();
	/** Show/hide agent icon in the header. */
	readonly showHeaderIcon = input<boolean>();
	/** Inline width. */
	readonly width = input<string | number>();
	/** Inline height. */
	readonly height = input<string | number>();
	/** Theme overrides for the chat UI. */
	readonly styleTokens = input<StyleTokens>();
	readonly isFileBased = input<boolean>();
	/** Optional. Resolved internally when omitted (frontdoor in dev, org URL in prod). */
	readonly salesforceOrigin = input<string>();
	/** Optional. Resolved internally in dev via /__lo/frontdoor when omitted. */
	readonly frontdoorUrl = input<string>();
	/** Callback invoked when the Lightning Out application is ready. */
	readonly onReady = input<AgentforceReadyHandler>();
	/** Callback invoked when a Lightning Out error occurs. */
	readonly onError = input<AgentforceErrorHandler>();

	/** Inline render target — present only when `inline()` is true. */
	private readonly host = viewChild<ElementRef<HTMLDivElement>>("host");

	/**
	 * Normalized embed config built from the flat inputs. Mirrors the React
	 * `useMemo`: undefined inputs are omitted so client defaults apply, and the
	 * `renderingConfig.mode` derives from `inline`. `showAvatar` and `channel`
	 * are fixed to match the React feature.
	 */
	protected readonly config = computed<AgentforceClientConfig>(() => {
		const renderingConfig: NonNullable<AgentforceClientConfig["renderingConfig"]> = {
			mode: this.inline() ? "inline" : "floating",
			...(this.headerEnabled() !== undefined && { headerEnabled: this.headerEnabled() }),
			...(this.showHeaderIcon() !== undefined && { showHeaderIcon: this.showHeaderIcon() }),
			showAvatar: false,
			...(this.width() !== undefined && { width: this.width() }),
			...(this.height() !== undefined && { height: this.height() }),
		};

		return {
			agentId: this.agentId(),
			...(this.agentLabel() !== undefined && { agentLabel: this.agentLabel() }),
			...(this.styleTokens() !== undefined && { styleTokens: this.styleTokens() }),
			...(this.isFileBased() !== undefined && { isFileBased: this.isFileBased() }),
			renderingConfig,
			channel: "Vibes",
		};
	});

	constructor() {
		// Embed after the view (and any inline host `<div>`) exists in the DOM —
		// the analogue of the React `useEffect`. The service guards against
		// double-embedding, so running once after render is sufficient.
		afterNextRender(() => {
			this.embedService.embed(
				this.config(),
				{
					salesforceOrigin: this.salesforceOrigin(),
					frontdoorUrl: this.frontdoorUrl(),
				},
				this.host()?.nativeElement ?? null,
				{ onReady: this.onReady(), onError: this.onError() },
			);
		});
	}
}
