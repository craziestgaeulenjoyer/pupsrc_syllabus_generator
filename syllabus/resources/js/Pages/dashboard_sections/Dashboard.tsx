import Navbar from '../navbar_layouts/Navbar'; 
import { Head } from '@inertiajs/react';

export default function Dashboard() {
    return (
        <div className="min-h-screen bg-slate-50">
            <Head title="Dashboard" />
            
            <Navbar />

            <main className="pt-24 px-4 md:px-8">
                <div className="max-w-7xl mx-auto">
                    <header className="mb-8">
                        <h1 className="text-3xl font-black text-slate-800 tracking-tight">
                            PUP SRC Syllabus Generator
                        </h1>
                        <p className="text-slate-500 mt-2">
                            Welcome back, Macy! Manage your academic syllabi efficiently.
                        </p>
                    </header>
                </div>
            </main>
        </div>
    );
}