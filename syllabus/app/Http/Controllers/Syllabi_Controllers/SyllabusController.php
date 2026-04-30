<?php

namespace App\Http\Controllers\Syllabi_Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\Syllabus;

class SyllabusController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'session_id' => 'required|string',
        ]);

        $sessionId = $request->session_id;
        $professorId = Auth::id();

        if (!$professorId) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $syllabus = Syllabus::updateOrCreate(
            [
                'session_id' => $sessionId,
                'professor_id' => $professorId
            ],
            [
                'course_code' => $request->course_code,
                'course_title' => $request->course_title,

                // Store each step as JSON
                'step1' => $request->step1,
                'step2' => $request->step2,
                'step3' => $request->step3,
                'step4' => $request->step4,
                'step5' => $request->step5,
                'step6' => $request->step6,

                // FULL merged syllabus
                'final_data' => $request->final_data,
            ]
        );

        return response()->json([
            'message' => 'Syllabus saved successfully',
            'data' => $syllabus
        ]);
    }
}