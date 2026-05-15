<?php

namespace App\Http\Controllers\Dashboard_Controllers;

use App\Http\Controllers\Controller;
use App\Helpers\SyllabusHashId;          // ← add this
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
            ->get()
            ->map(fn($s) => [
                'id'                 => $s->id,
                'editHash'           => SyllabusHashId::encode($s->id),  // ← add this
                'course_code'        => $s->course_code,
                'course_title'       => $s->course_title,
                'course_name_header' => $s->course_name_header,
                'syllabus_name'      => $s->syllabus_name,
                'created_at'         => $s->created_at,
                'updated_at'         => $s->updated_at,
            ]);

        return Inertia::render('dashboard_sections/Dashboard', [
            'syllabuses' => $syllabuses,
        ]);
    }
}