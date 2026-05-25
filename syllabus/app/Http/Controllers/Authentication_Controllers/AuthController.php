<?php

namespace App\Http\Controllers\Authentication_Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use App\Models\Professor;

class AuthController extends Controller
{
    // WEB LOGIN (Inertia)
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        $key = 'login_attempts_' . $credentials['email'];
        $fakeLock = Cache::get($key . '_lock');

        if ($fakeLock && now()->lt($fakeLock)) {
            // FIX: Send seconds remaining instead of the raw ISO timestamp
            $secondsRemaining = max(0, Carbon::now()->diffInSeconds($fakeLock, false));

            return back()->withErrors([
                'email' => 'Invalid credentials.',
                'lock_seconds' => $secondsRemaining,
            ]);
        }

        $user = Professor::where('email', $credentials['email'])->first();

        // USER NOT FOUND
        if (!$user) {
            usleep(300000); // anti-timing

            $attempts = Cache::get($key, 0) + 1;
            Cache::put($key, $attempts, now()->addMinutes(5));

            $maxAttempts = 3;

            // LOCK fake user too
            if ($attempts >= $maxAttempts) {
                $lockUntil = now()->addMinutes(1);
                Cache::put($key . '_lock', $lockUntil, now()->addMinutes(1));

                // FIX: Send seconds remaining instead of ISO timestamp
                $secondsRemaining = max(0, Carbon::now()->diffInSeconds($lockUntil, false));

                return back()->withErrors([
                    'email' => 'Invalid credentials.',
                    'lock_seconds' => $secondsRemaining,
                ]);
            }

            // FIX: Don't reveal attempts_left — generic message only
            return back()->withErrors([
                'email' => 'Invalid credentials.',
            ]);
        }

        // CHECK IF LOCKED
        if ($user->lock_until && Carbon::now()->lt($user->lock_until)) {
            // FIX: Send seconds remaining instead of ISO timestamp
            $secondsRemaining = max(0, Carbon::now()->diffInSeconds($user->lock_until, false));

            return back()->withErrors([
                'email' => 'Invalid credentials.',
                'lock_seconds' => $secondsRemaining,
            ]);
        }

        // ATTEMPT LOGIN
        if (Auth::attempt($credentials)) {
            Cache::forget('login_attempts_' . $credentials['email']);
            Cache::forget('login_attempts_' . $credentials['email'] . '_lock');

            // RESET attempts on success
            $user->update([
                'login_attempts' => 0,
                'lock_until' => null,
            ]);

            $request->session()->regenerate();

            Auth::logoutOtherDevices($request->password);

            return redirect()->route('dashboard');
        }

        // FAILED LOGIN
        $user->login_attempts += 1;

        $maxAttempts = 3;

        // LOCK AFTER 3 ATTEMPTS
        if ($user->login_attempts >= 3) {
            $lockMinutes = 1;  // set to '30' when in production; currently set to '1' for testing purposes

            $user->lock_until = Carbon::now()->addMinutes($lockMinutes);
            $user->login_attempts = 0;
            $user->save();

            // FIX: Send seconds remaining instead of ISO timestamp
            $secondsRemaining = max(0, Carbon::now()->diffInSeconds($user->lock_until, false));

            return back()->withErrors([
                'email' => 'Invalid credentials.',
                'lock_seconds' => $secondsRemaining,
            ]);
        }

        $user->save();

        // FIX: Don't reveal attempts_left — generic message only
        return back()->withErrors([
            'email' => 'Invalid credentials.',
        ]);
    }

    public function logout(Request $request)
    {
        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login');
    }

    // API LOGIN (optional)
    public function apiLogin(Request $request)
    {
        $user = Professor::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'token' => $token,
            // FIX: Only return safe fields — never the full model
            'user' => $user->only(['name', 'email']),
        ]);
    }

    public function apiLogout(Request $request)
    {
        $request->user()->tokens()->delete();

        return response()->json(['message' => 'Logged out']);
    }

    public function user(Request $request)
    {
        // FIX: Only return safe fields — never the full model
        return response()->json($request->user()->only(['name', 'email']));
    }
}