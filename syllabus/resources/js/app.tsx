import './css/app.css';
import '../js/bootstrap'; 
import { createRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
import React from 'react';
import GlobalSessionModal from './Layouts/GlobalSessionModal';

function GlobalSessionHandler({ flash }: any) {
    const [open, setOpen] = React.useState(false);

    React.useEffect(() => {
        if (flash?.error || flash?.session_expired) {
            setOpen(true);
        }
    }, [flash]);

    return (
        <GlobalSessionModal
            open={open}
            message={flash?.error || 'Session expired. Please login again.'}
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