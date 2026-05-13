<?php

namespace App\Http\Controllers\Dashboard_Controllers;

use App\Http\Controllers\Controller;
use App\Models\Syllabus;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        $professorId = Auth::id();

        $syllabuses = Syllabus::where('professor_id', $professorId)
            ->orderByDesc('updated_at')
            ->get([
                'id',
                'course_code',
                'course_title',
                'course_name_header',
                'created_at',
                'updated_at',
            ]);

        return Inertia::render('dashboard_sections/Dashboard', [
            'syllabuses' => $syllabuses,
        ]);
    }
}