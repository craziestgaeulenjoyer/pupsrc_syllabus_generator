<?php

namespace App\Http\Controllers\Syllabi_Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use App\Models\Syllabus;

class SyllabusController extends Controller
{
    /**
     * Save or update a syllabus with all step data.
     * Called automatically when the checklist is fully verified
     * and again when the user clicks "Generate & Download".
     */
    public function store(Request $request)
    {
        $request->validate([
            'syllabus_session_id' => 'required|string|max:255',
        ]);

        $sessionId   = $request->syllabus_session_id;
        $professorId = Auth::id();

        if (!$professorId) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        // ── Decode each step safely ──────────────────────────────────────────
        $step1 = $this->safeJson($request->step1);
        $step2 = $this->safeJson($request->step2);
        $step3 = $this->safeJson($request->step3);
        $step4 = $this->safeJson($request->step4);
        $step5 = $this->safeJson($request->step5);
        $step6 = $this->safeJson($request->step6);

        // ── Resolve course_code / course_title ──────────────────────────────
        // The frontend sends them both at root AND nested in step1/final_data.
        // Accept whichever is populated.
        $courseCode  = $request->course_code  ?: ($step1['course_code']  ?? '');
        $courseTitle = $request->course_title ?: ($step1['course_title'] ?? '');

        // ── Build / update the syllabus record ──────────────────────────────
        $syllabus = Syllabus::updateOrCreate(
            [
                'syllabus_session_id' => $sessionId,
                'professor_id'        => $professorId,
            ],
            [
                'course_code'  => $courseCode,
                'course_title' => $courseTitle,

                'step1' => $step1,
                'step2' => $step2,
                'step3' => $step3,
                'step4' => $step4,
                'step5' => $step5,
                'step6' => $step6,

                // final_data is the flattened representation used by
                // the PDF/DOCX generator — keep it in sync.
                'final_data' => $this->safeJson($request->final_data),
            ]
        );

        Log::info('Syllabus saved', [
            'session_id'   => $sessionId,
            'professor_id' => $professorId,
            'syllabus_id'  => $syllabus->id,
            'course_code'  => $courseCode,
        ]);

        return response()->json([
            'message' => 'Syllabus saved successfully',
            'data'    => $syllabus,
        ]);
    }

    /**
     * Safely decode a value that may be a JSON string, an array,
     * or null/empty — always returning an array.
     */
    private function safeJson($data): array
    {
        // Already an array (Laravel auto-decoded JSON body)
        if (is_array($data)) {
            return $data;
        }

        // Null / empty
        if (empty($data)) {
            return [];
        }

        // JSON string
        if (is_string($data)) {
            $decoded = json_decode($data, true);
            return json_last_error() === JSON_ERROR_NONE ? ($decoded ?? []) : [];
        }

        return [];
    }
}