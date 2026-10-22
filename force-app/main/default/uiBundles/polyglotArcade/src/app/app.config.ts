/**
 * Copyright (c) 2026, Salesforce, Inc.,
 * All rights reserved.
 * For full license text, see the LICENSE.txt file
 */
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideNativeDateAdapter as provideBrnNativeDateAdapter } from '@spartan-ng/brain/date-time';
import { provideNgIconsConfig } from '@ng-icons/core';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
	providers: [
		provideBrowserGlobalErrorListeners(),
		provideRouter(routes),
		provideBrnNativeDateAdapter(),
		provideNgIconsConfig({ size: '1rem' }),
	],
};
