/**
 * Copyright (c) 2026, Salesforce, Inc.,
 * All rights reserved.
 * For full license text, see the LICENSE.txt file
 */
import { Injectable } from "@angular/core";
import {
	embedAgentforceClient,
	type AgentforceClientConfig,
} from "@salesforce/agentforce-conversation-client";
import { createAccEmbedder } from "@salesforce/agentforce-conversation-client/ui-bundle";
import type {
	AgentforceErrorHandler,
	AgentforceReadyHandler,
	ResolvedEmbedOptions,
} from "../../types/conversation";

/** Optional ready/error handlers forwarded to the embed client. */
export interface AgentforceEmbedHandlers {
	onReady?: AgentforceReadyHandler;
	onError?: AgentforceErrorHandler;
}

/**
 * App-wide singleton that owns the one-time Lightning Out embed of the
 * Agentforce Conversation Client. Because the service is `providedIn: 'root'`,
 * a single instance is shared across the app; it delegates to the shared,
 * framework-agnostic `@salesforce/agentforce-conversation-client/ui-bundle`
 * embedder, which owns the embed
 * orchestration (window singleton, global host, dev frontdoor fetch, `SFDC_ENV`
 * default, and partial-embed cleanup) that used to be duplicated here and in the
 * React feature.
 *
 * A valid Salesforce session is required for the given org. Config is passed
 * through to the embed client as-is.
 */
@Injectable({ providedIn: "root" })
export class AgentforceEmbedService {
	private readonly embedder = createAccEmbedder<AgentforceClientConfig>(embedAgentforceClient);

	/**
	 * Embed the client once. Subsequent calls are no-ops while an embed is in
	 * flight or already complete. `host` is the inline container element (when
	 * rendering inline); when omitted the shared floating host is used.
	 */
	embed(
		config: AgentforceClientConfig,
		overrides: ResolvedEmbedOptions,
		host?: HTMLElement | null,
		handlers?: AgentforceEmbedHandlers,
	): void {
		this.embedder.embedAcc(config, overrides, host, handlers);
	}
}
