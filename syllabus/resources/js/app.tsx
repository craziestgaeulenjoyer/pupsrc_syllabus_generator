import './css/app.css';
import { createRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';

createInertiaApp({
    resolve: async (name) => {
        const pages = import.meta.glob('./Pages/**/*.tsx');

        const path = `./Pages/${name}.tsx`;
        const pageImport = pages[path];

        if (!pageImport) {
            console.error("Page not found:", name);
            throw new Error(`Page not found: ${name}`);
        }

        const page: any = await pageImport();

        page.default.layout = page.default.layout || ((page: any) => page);

        return page;
    },

    setup({ el, App, props }) {
        createRoot(el).render(<App {...props} />);
    },
});