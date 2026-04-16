import './css/app.css';
import { createRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';

createInertiaApp({
    resolve: (name) => 
        resolvePageComponent(
            `./Pages/${name}.tsx`, 
            import.meta.glob('./Pages/**/*.tsx')
        ) as any,

    setup({ el, App, props }) {
        createRoot(el).render(<App {...props} />);
    },
});