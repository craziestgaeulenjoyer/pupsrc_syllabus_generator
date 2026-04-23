<?php

namespace App\Http\Controllers\Authentication_Controllers;

use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Carbon\Carbon;
use App\Models\Professor;
use App\Models\PasswordOtp;

class ForgotPasswordController extends Controller {
    public function sendOtp(Request $request)
    {
        $request->validate([
            'email' => 'required|email|exists:professors,email',
        ]);

        $otp = rand(100000, 999999);

        PasswordOtp::updateOrCreate(
            ['email' => $request->email],
            [
                'otp' => $otp,
                'expires_at' => Carbon::now()->addMinutes(5),
            ]
        );

        Mail::raw("Your OTP is: $otp", function ($message) use ($request) {
            $message->to($request->email)
                    ->subject('Password Reset OTP');
        });

        // STORE SESSION FLAG
        session([
            'otp_email' => $request->email,
            'otp_sent' => true
        ]);

        return redirect()->route('otp.form');
    }

    public function verifyOtp(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'code' => 'required'
        ]);

        $record = PasswordOtp::where('email', $request->email)
            ->where('otp', $request->code)
            ->first();

        if (!$record) {
            return back()->withErrors(['otp' => 'Invalid OTP']);
        }

        if (Carbon::now()->gt($record->expires_at)) {
            return back()->withErrors(['otp' => 'OTP expired']);
        }

        // MARK OTP AS VERIFIED
        session([
            'otp_verified' => true,
            'otp_email' => $request->email
        ]);

        return redirect()->route('password.reset.form');
    }

    public function resetPassword(Request $request)
    {
        \Log::info('Reset password request received', $request->all());

        $request->validate([
            'email' => 'required|email',
            'password' => 'required|min:6|confirmed',
        ]);

        $user = Professor::where('email', $request->email)->first();

        if (!$user) {
            \Log::error('User not found for email: ' . $request->email);
            return back()->withErrors(['email' => 'User not found']);
        }

        $user->update([
            'password' => \Hash::make($request->password)
        ]);

        \Log::info('Password successfully updated for: ' . $request->email);

        PasswordOtp::where('email', $request->email)->delete();

        \Log::info('OTP deleted for: ' . $request->email);

        session()->forget(['otp_sent', 'otp_verified', 'otp_email']);

        return redirect()->route('login')->with('success', 'Password updated');
    }
}