<?php

use App\Http\Controllers\Authentication_Controllers\AuthController;
use App\Http\Controllers\Authentication_Controllers\ForgotPasswordController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/* ---------------- AUTHENTICATION ROUTES ---------------- */
// GET route
Route::get('/', function () {
    return redirect()->route('login');
});

Route::get('/login', function () {
    return Inertia::render('login_sections/Login');
})->name('login'); 

// POST route
Route::post('/login', [AuthController::class, 'login'])->name('login.attempt');

// Forgot Password 
Route::get('/forgot-password', fn() => Inertia::render('login_sections/ForgotPassword'))->name('password.request');
Route::post('/forgot-password', [ForgotPasswordController::class, 'sendOtp'])->name('password.email');

// Verify OTP
Route::get('/verify-otp', function () {
    return Inertia::render('login_sections/VerifyOTP', [
        'email' => request('email')
    ]);
})->name('otp.form');

Route::post('/verify-otp', [ForgotPasswordController::class, 'verifyOtp'])->name('otp.verify');

// Resets Password
Route::get('/reset-password', function () {
    return Inertia::render('login_sections/UpdatePassword', [
        'email' => request('email') 
    ]);
})->name('password.reset.form');
Route::post('/reset-password', [ForgotPasswordController::class, 'resetPassword'])->name('password.update');

// Logout 
Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

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