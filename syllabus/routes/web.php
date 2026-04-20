<?php

use App\Http\Controllers\Authentication_Controllers\AuthController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/* ---------------- AUTHENTICATION ROUTES ---------------- */
// GET route
Route::get('/', function () {
    return Inertia::render('login_sections/Login');
})->name('login'); 

// POST route
Route::post('/login', [AuthController::class, 'login'])->name('login.attempt');

// Logout 
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

Route::post('/syllabus-generator/step-1', function () {

// Step 1
    return back()->with('success', 'Step 1 saved!');
})->name('syllabus.step1.store');

// Step 2
Route::get('/syllabus-generator/step-2', function () {
    return Inertia::render('syllabus_steps/Step2');
})->name('syllabus.step2');

// Step 3
Route::get('/syllabus-generator/step-3', function () {
    return Inertia::render('syllabus_steps/Step3');
})->name('syllabus.step3');

Route::post('/syllabus-generator/step-3', function () {
    return back()->with('success', 'Weekly Plan saved!');
})->name('syllabus.step3.store');

// Step 4
Route::get('/syllabus-generator/step-4', function () {
    return Inertia::render('syllabus_steps/Step4'); 
})->name('syllabus.step4');

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