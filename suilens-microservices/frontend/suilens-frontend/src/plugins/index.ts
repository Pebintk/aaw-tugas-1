import router from '../router';
import {createPinia} from 'pinia';
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query';

/**
 * plugins/index.ts
 *
 * Automatically included in `./src/main.ts`
 */

// Types
import type { App } from 'vue'

// Plugins
import vuetify from './vuetify';
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});



export function registerPlugins (app: App) {
 app.use(vuetify)
 app.use(createPinia());
 app.use(router);
app.use(VueQueryPlugin, { queryClient });

}