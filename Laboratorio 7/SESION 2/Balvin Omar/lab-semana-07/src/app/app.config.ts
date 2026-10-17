import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideBrowserGlobalErrorListeners } from '@angular/core';

export const appConfig: ApplicationConfig = {
  providers: [provideBrowserGlobalErrorListeners()]
};