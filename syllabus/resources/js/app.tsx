import './css/app.css';
import '../js/bootstrap'; 
import { createRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
import React from 'react';
import axios from 'axios';
import GlobalSessionModal from './Layouts/GlobalSessionModal';

// ── Global flag so the modal only fires once even if multiple requests 401 ──
let sessionExpiredTriggered = false;

// ── Register axios interceptor once at module load ──────────────────────────
axios.interceptors.response.use(
    response => response,
    error => {
        const status = error.response?.status;
        if ((status === 401 || status === 419) && !sessionExpiredTriggered) {
            sessionExpiredTriggered = true;
            window.dispatchEvent(new CustomEvent('session-expired'));
        }
        return Promise.reject(error);
    }
);

function GlobalSessionHandler({ flash }: any) {
    const [open, setOpen] = React.useState(false);

    // Triggered by axios interceptor (401/419)
    React.useEffect(() => {
        const handler = () => setOpen(true);
        window.addEventListener('session-expired', handler);
        return () => window.removeEventListener('session-expired', handler);
    }, []);

    // Also triggered by server-side flash (Inertia redirect responses)
    React.useEffect(() => {
        if (flash?.error || flash?.session_expired) {
            setOpen(true);
        }
    }, [flash]);

    return (
        <GlobalSessionModal
            open={open}
            message={flash?.error || 'Session expired. Please log in again.'}
            onClose={() => (window.location.href = '/login')}
        />
    );
}

createInertiaApp({
    resolve: async (name) => {
        const pages = import.meta.glob('./Pages/**/*.tsx');

        const pageImport = pages[`./Pages/${name}.tsx`];

        if (!pageImport) {
            throw new Error(`Page not found: ${name}`);
        }

        const page: any = await pageImport();

        page.default.layout =
            page.default.layout ||
            ((page: any) => page);

        return page;
    },

    setup({ el, App, props }) {
        const existingRoot = (el as any)._reactRoot;

        if (existingRoot) {
            existingRoot.render(
                <>
                    <App {...props} />
                    <GlobalSessionHandler flash={props?.initialPage?.props?.flash} />
                </>
            );

            return;
        }

        const root = createRoot(el);

        (el as any)._reactRoot = root;

        root.render(
            <>
                <App {...props} />
                <GlobalSessionHandler flash={props?.initialPage?.props?.flash} />
            </>
        );
    },
});