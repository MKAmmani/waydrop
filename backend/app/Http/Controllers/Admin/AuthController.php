<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    /**
     * Show custom Waydrop Desk login screen.
     */
    public function showLogin()
    {
        if (Auth::check()) {
            return redirect()->route('desk.today');
        }

        return view('desk.login');
    }

    /**
     * Authenticate staff / administrator credentials.
     */
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $remember = $request->boolean('remember');

        if (Auth::attempt($credentials, $remember)) {
            $user = Auth::user();

            // Restrict access strictly to super_admin, admin, and staff
            if (!$user->isStaffOrAdmin()) {
                Auth::logout();
                return back()->withErrors([
                    'email' => 'Access restricted: Only administrative and campus desk staff accounts can access Waydrop Desk.',
                ])->withInput($request->only('email'));
            }

            if ($user->is_blocked) {
                Auth::logout();
                return back()->withErrors([
                    'email' => 'Your staff account has been suspended: ' . ($user->block_reason ?? 'Please contact platform security.'),
                ]);
            }

            $request->session()->regenerate();

            return redirect()->intended(route('desk.today'));
        }

        return back()->withErrors([
            'email' => 'The provided credentials do not match our staff records.',
        ])->withInput($request->only('email'));
    }

    /**
     * Log out of Waydrop Desk.
     */
    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login');
    }
}
