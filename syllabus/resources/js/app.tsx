import './css/app.css';
import { createRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';

createInertiaApp({
    resolve: name => import(`./Pages/${name}.tsx`).then(module => module.default),
    setup({ el, App, props }) {
        createRoot(el).render(<App {...props} />);
    },
});