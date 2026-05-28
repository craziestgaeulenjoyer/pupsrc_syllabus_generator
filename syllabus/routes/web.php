<?php

use App\Http\Controllers\Authentication_Controllers\AuthController;
use App\Http\Controllers\Authentication_Controllers\ForgotPasswordController;
use App\Http\Controllers\Syllabi_Controllers\SyllabusController;
use App\Http\Controllers\Syllabi_Controllers\SyllabusEditController;
use App\Http\Controllers\Dashboard_Controllers\DashboardController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/test-gd', function () {
    return extension_loaded('gd') ? 'GD Enabled' : 'GD Missing';
});

Route::get('/phpinfo-test', function () {
    phpinfo();
});

Route::get('/google-oauth-callback', function () {
    // COOP must be relaxed on this page so the popup can postMessage the OAuth
    // token back to the opener and so that window.closed polling works without
    // throwing a cross-origin security error.
    return response()->view('google-oauth-callback')
        ->header('Cross-Origin-Opener-Policy',   'unsafe-none')
        ->header('Cross-Origin-Embedder-Policy', 'unsafe-none');
});

/* ---------------- AUTHENTICATION ROUTES ---------------- */
Route::get('/', function () {
    return redirect()->route('login');
});

Route::get('/login', function () {
    return Inertia::render('login_sections/Login');
})->name('login');

Route::post('/login', [AuthController::class, 'login'])
    ->name('login.attempt')
    ->middleware('throttle:5,1');

// Forgot Password
Route::get('/forgot-password', fn() => Inertia::render('login_sections/ForgotPassword'))->name('password.request');
Route::post('/forgot-password', [ForgotPasswordController::class, 'sendOtp'])->name('password.email');

// Verify OTP
Route::get('/verify-otp', function () {
    if (!session('otp_sent')) {
        return redirect()->route('password.request');
    }
    return Inertia::render('login_sections/VerifyOTP', [
        'email' => session('otp_email')
    ]);
})->name('otp.form');

Route::post('/verify-otp', [ForgotPasswordController::class, 'verifyOtp'])->name('otp.verify');

// Reset Password
Route::get('/reset-password', function () {
    if (!session('otp_verified')) {
        return redirect()->route('password.request');
    }
    return Inertia::render('login_sections/UpdatePassword', [
        'email' => session('otp_email')
    ]);
})->name('password.reset.form');

Route::post('/reset-password', [ForgotPasswordController::class, 'resetPassword'])->name('password.update');

// Logout
Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

/* ---------------- PROTECTED ROUTES ---------------- */

Route::middleware(['auth'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    /* ---------------- SYLLABUS ROUTES ---------------- */
    // Step Views (create mode)
    Route::get('/syllabus-generator/step-1', fn() => Inertia::render('syllabus_steps/Step1'))->name('syllabus.step1');
    Route::get('/syllabus-generator/step-2', fn() => Inertia::render('syllabus_steps/Step2'))->name('syllabus.step2');
    Route::get('/syllabus-generator/step-3', fn() => Inertia::render('syllabus_steps/Step3'))->name('syllabus.step3');
    Route::get('/syllabus-generator/step-4', fn() => Inertia::render('syllabus_steps/Step4'))->name('syllabus.step4');
    Route::get('/syllabus-generator/step-5', fn() => Inertia::render('syllabus_steps/Step5'))->name('syllabus.step5');

    // Step 6 needs COOP relaxed so the Google OAuth popup can postMessage the
    // token back to this page. Both the opener (step-6) AND the popup
    // (google-oauth-callback) must have the same COOP policy (unsafe-none),
    // otherwise the browser silently blocks postMessage and window.closed polling,
    // causing the OAuth flow to stall and the token to never arrive.
    Route::get('/syllabus-generator/step-6', function () {
        return response(Inertia::render('syllabus_steps/Step6'))
            ->header('Cross-Origin-Opener-Policy',   'unsafe-none')
            ->header('Cross-Origin-Embedder-Policy', 'unsafe-none');
    })->name('syllabus.step6');

    // Step Views (edit mode — {hash} is an encrypted token, never a raw DB id)
    Route::get('/syllabus-generator/step-1/{hash}/edit', [SyllabusEditController::class, 'editStep1'])->name('syllabus.step1.edit');
    Route::get('/syllabus-generator/step-2/{hash}/edit', [SyllabusEditController::class, 'editStep2'])->name('syllabus.step2.edit');
    Route::get('/syllabus-generator/step-3/{hash}/edit', [SyllabusEditController::class, 'editStep3'])->name('syllabus.step3.edit');
    Route::get('/syllabus-generator/step-4/{hash}/edit', [SyllabusEditController::class, 'editStep4'])->name('syllabus.step4.edit');
    Route::get('/syllabus-generator/step-5/{hash}/edit', [SyllabusEditController::class, 'editStep5'])->name('syllabus.step5.edit');

    // Edit mode step-6 also needs relaxed COOP for the same OAuth popup reason.
    // IMPORTANT: editStep6() returns an Inertia\Response, NOT a plain string.
    // Wrapping it in response() fails because Response::setContent() only accepts
    // ?string. Instead, call ->withHeaders() directly on the Inertia response.
    // Step-6 edit: COOP headers are set inside editStep6() itself (on the resolved
    // HTTP response) so they cannot be overridden by downstream middleware.
    Route::get('/syllabus-generator/step-6/{hash}/edit', [SyllabusEditController::class, 'editStep6'])
        ->name('syllabus.step6.edit');

    // Save syllabus (all steps + header/footer)
    Route::post('/syllabus-generator/save', [SyllabusController::class, 'store'])
        ->name('syllabus.save');

    // Alias kept for backward compatibility (older frontend references)
    Route::post('/syllabus/save', [SyllabusController::class, 'store'])
        ->name('syllabus.save.alias');

    // Full update (edit — all steps re-saved)
    Route::patch('/syllabi/{hash}', [SyllabusController::class, 'update'])
        ->name('syllabi.update');

    // Rename only (updates syllabus_name label, nothing else)
    Route::patch('/syllabi/{hash}/rename', [SyllabusController::class, 'rename'])
        ->name('syllabi.rename');

    // Delete
    Route::delete('/syllabi/{hash}', [SyllabusController::class, 'destroy'])
        ->name('syllabi.destroy');

    /* ---------------- PDF VIEWER ROUTES ---------------- */
    Route::get('/viewer/{id}', [SyllabusController::class, 'show'])->name('syllabus.view');
    Route::get('/viewer/{id}/view', [SyllabusController::class, 'showViewer'])->name('syllabus.viewer');

    // ── TEMPORARY DEBUG ROUTE — remove after fixing ──────────────────────────
    Route::get('/debug-gdocs-logs', function () {
        $logPath = storage_path('logs/laravel.log');

        if (!file_exists($logPath)) {
            return response('No laravel.log found at: ' . $logPath, 404);
        }

        // Read last ~50KB
        $fp = fopen($logPath, 'r');
        fseek($fp, -1024 * 50, SEEK_END);
        fgets($fp); // skip partial first line
        $lines = [];
        while (!feof($fp)) {
            $lines[] = rtrim(fgets($fp));
        }
        fclose($fp);

        $keywords = [
            'saveDocxForGoogleDocs', 'buildDocxToPath',
            'Syllabus DOCX', 'Google Docs', 'export failed',
            'PhpWord save failed', 'DOCX generation',
            'base64', 'syllabus_gdocs_', 'Syllabus saved',
            'Syllabus export',
        ];

        $relevant = array_filter($lines, function (string $line) use ($keywords) {
            foreach ($keywords as $kw) {
                if (stripos($line, $kw) !== false) return true;
            }
            return false;
        });

        $output = empty($relevant)
            ? "No relevant entries found.\nReproduce the error first, then reload this page."
            : implode("\n", $relevant);

        return response($output, 200, ['Content-Type' => 'text/plain']);
    })->name('debug.gdocs.logs');
});