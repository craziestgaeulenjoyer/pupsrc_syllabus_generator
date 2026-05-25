<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class Professor extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'login_attempts',
        'lock_until',
    ];

    // FIX: Added login_attempts and lock_until so they are never serialized
    // into Inertia props or API responses, even if the full model is passed accidentally.
    protected $hidden = [
        'password',
        'remember_token',
        'login_attempts',
        'lock_until',
    ];

    protected $casts = [
        'lock_until' => 'datetime',
    ];

    public function syllabi()
    {
        return $this->hasMany(Syllabus::class);
    }
}