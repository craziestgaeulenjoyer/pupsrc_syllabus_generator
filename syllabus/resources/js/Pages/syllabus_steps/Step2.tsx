import React from 'react';
import { Head } from '@inertiajs/react';
import Navbar from '../navbar_layouts/Navbar';

const Step2 = () => {
    return (
        <div className="min-h-screen bg-[#F3F4F6]">
            <Navbar />

            <Head title="Step 2: Learning Outcomes" />

            <div className="pt-24 max-w-5xl mx-auto px-6">
                <h1 className="text-3xl font-black text-[#800000] mb-4">
                    Step 2: Map Learning Outcomes
                </h1>

                <div className="bg-white p-6 rounded-2xl shadow">
                    <p className="text-gray-600">
                        This is a placeholder for Step 2.
                        You will map learning outcomes here.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Step2;