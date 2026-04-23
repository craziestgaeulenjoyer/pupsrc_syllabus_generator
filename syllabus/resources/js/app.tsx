import './css/app.css';
import { createRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { router } from '@inertiajs/react';
import React, { useState } from 'react';
import { route } from 'ziggy-js';

function AppWrapper({ App, props }: any) {
    const [sessionExpired, setSessionExpired] = useState(false);

    // GLOBAL ERROR HANDLER
    router.on('error', (event: any) => {
        const status = event?.detail?.response?.status;

        if (status === 401 || status === 419) {
            setSessionExpired(true);
        }
    });

    return (
        <>
            <App {...props} />

            {/* SESSION EXPIRED MODAL */}
            {sessionExpired && (
                <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center">
                    <div className="bg-white rounded-2xl shadow-xl p-6 w-[90%] max-w-sm text-center">
                        <h2 className="text-lg font-bold text-[#800000] mb-2">
                            Session Expired
                        </h2>
                        <p className="text-sm text-gray-600 mb-6">
                            Your session has expired. Please login again.
                        </p>

                        <button
                            onClick={() => window.location.href = route('/login')}
                            className="bg-[#800000] text-white px-6 py-2 rounded-lg font-bold hover:bg-[#600000]"
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

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
        createRoot(el).render(<AppWrapper App={App} props={props} />);
    },
});