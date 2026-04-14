<?php

use App\Http\Controllers\Authentication_Controllers\AuthController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/* ---------------- AUTHENTICATION ROUTES ---------------- */

// Login Page
Route::get('/', function () {
    return Inertia::render('login_sections/Login');
})->name('login');

// Login POST (IMPORTANT: rename to 'login')
Route::post('/login', [AuthController::class, 'login'])->name('login.attempt');

// Logoutz`
Route::post('/logout', [AuthController::class, 'logout'])->name('logout');


/* ---------------- PASSWORD FLOW ---------------- */

Route::get('/forgot-password', fn () => Inertia::render('login_sections/ForgotPassword'))
    ->name('password.request');

Route::get('/verify-access', fn () => Inertia::render('login_sections/VerifyOTP'))
    ->name('password.verify');

Route::get('/update-password', fn () => Inertia::render('login_sections/UpdatePassword'))
    ->name('password.reset');


/* ---------------- PROTECTED ROUTES ---------------- */

Route::middleware(['auth'])->group(function () {

Route::get('/dashboard', function () {
    return Inertia::render('dashboard_sections/Dashboard');
})->name('dashboard');

/* ---------------- SYLLABUS ROUTES ---------------- */

Route::get('/syllabus-generator/step-1', function () {
    return Inertia::render('syllabus_steps/Step1');
})->name('syllabus.step1');

/* ---------------- PDF VIEWER ROUTES ---------------- */
Route::get('/viewer/{id}', function ($id) {
    $file = [
        "id" => $id,
        "name" => "BSIT 2026 - SYLLABUS",
        "date" => "January 25, 2026",
        "url" => "/sample.pdf"
    ];

    return Inertia::render('pdf_viewer_layout/PdfViewer', [
        'file' => $file
    ]);
});

});