<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/* ---------------- LOGIN ROUTES ---------------- */

/* ---------------- NAVBAR ROUTES ---------------- */

Route::get('/navbar', function () {
    return Inertia::render('navbar_layouts/Navbar');
});

/* ---------------- DASHBOARD ROUTES ---------------- */

Route::get('/dashboard', function () {
    return Inertia::render('dashboard_sections/Dashboard');
});
