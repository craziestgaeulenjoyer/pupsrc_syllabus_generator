<?php

namespace App\Http\Controllers\Syllabi_Controllers;

use App\Http\Controllers\Controller;
use App\Models\Syllabus;
use App\Helpers\SyllabusHashId;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

/**
 * Handles the "Edit" flow — loads an existing syllabus record and
 * sends each step's JSON blob back to the matching Inertia step view.
 *
 * Routes (add to web.php inside the auth group):
 *   GET /syllabus-generator/step-1/{id}  → editStep1   name: syllabus.step1.edit
 *   GET /syllabus-generator/step-2/{id}  → editStep2   name: syllabus.step2.edit
 *   GET /syllabus-generator/step-3/{id}  → editStep3   name: syllabus.step3.edit
 *   GET /syllabus-generator/step-4/{id}  → editStep4   name: syllabus.step4.edit
 *   GET /syllabus-generator/step-5/{id}  → editStep5   name: syllabus.step5.edit
 *   GET /syllabus-generator/step-6/{id}  → editStep6   name: syllabus.step6.edit
 */
class SyllabusEditController extends Controller
{
    // ── Shared: fetch & authorise ────────────────────────────────────────────
    private function findOwned(int $id): Syllabus
    {
        return Syllabus::where('id', $id)
            ->where('professor_id', Auth::id())
            ->firstOrFail();
    }

    private function safeJson($data): array
    {
        if (is_array($data))  return $data;
        if (empty($data))     return [];
        if (is_string($data)) {
            $decoded = json_decode($data, true);
            return json_last_error() === JSON_ERROR_NONE ? ($decoded ?? []) : [];
        }
        return [];
    }

    // ── Step 1 ───────────────────────────────────────────────────────────────
    public function editStep1(string $hash)
    {
        $id = SyllabusHashId::decode($hash); 
        $syllabus = $this->findOwned($id);

        return Inertia::render('syllabus_steps/Step1', [
            'isEditMode'   => true,
            'syllabusHash' => $hash,
            'sessionId'    => $syllabus->session_id,
            'step1'        => $this->safeJson($syllabus->step1),
        ]);
    }

    // ── Step 2 ───────────────────────────────────────────────────────────────
    public function editStep2(string $hash)
    {
        $id = SyllabusHashId::decode($hash); 
        $syllabus = $this->findOwned($id);

        return Inertia::render('syllabus_steps/Step2', [
            'isEditMode'   => true,
            'syllabusHash' => $hash,
            'sessionId'    => $syllabus->session_id,
            'step1'        => $this->safeJson($syllabus->step1),
            'step2'        => $this->safeJson($syllabus->step2),
        ]);
    }

    // ── Step 3 ───────────────────────────────────────────────────────────────
    public function editStep3(string $hash)
    {
        $id = SyllabusHashId::decode($hash); 
        $syllabus = $this->findOwned($id);

        return Inertia::render('syllabus_steps/Step3', [
            'isEditMode'   => true,
            'syllabusHash' => $hash,
            'sessionId'    => $syllabus->session_id,
            'step1'        => $this->safeJson($syllabus->step1),
            'step2'        => $this->safeJson($syllabus->step2),
            'step3'        => $this->safeJson($syllabus->step3),
        ]);
    }

    // ── Step 4 ───────────────────────────────────────────────────────────────
    public function editStep4(string $hash)
    {
        $id = SyllabusHashId::decode($hash); 
        $syllabus = $this->findOwned($id);

        return Inertia::render('syllabus_steps/Step4', [
            'isEditMode'   => true,
            'syllabusHash' => $hash,
            'sessionId'    => $syllabus->session_id,
            'step1'        => $this->safeJson($syllabus->step1),
            'step2'        => $this->safeJson($syllabus->step2),
            'step3'        => $this->safeJson($syllabus->step3),
            'step4'        => $this->safeJson($syllabus->step4),
        ]);
    }

    // ── Step 5 ───────────────────────────────────────────────────────────────
    public function editStep5(string $hash)
    {
        $id = SyllabusHashId::decode($hash); 
        $syllabus = $this->findOwned($id);

        return Inertia::render('syllabus_steps/Step5', [
            'isEditMode'   => true,
            'syllabusHash' => $hash,
            'sessionId'    => $syllabus->session_id,
            'step1'        => $this->safeJson($syllabus->step1),
            'step2'        => $this->safeJson($syllabus->step2),
            'step3'        => $this->safeJson($syllabus->step3),
            'step4'        => $this->safeJson($syllabus->step4),
            'step5'        => $this->safeJson($syllabus->step5),
        ]);
    }

    // ── Step 6 ───────────────────────────────────────────────────────────────
    public function editStep6(string $hash)
    {
        $id = SyllabusHashId::decode($hash); 
        $syllabus = $this->findOwned($id);

        return Inertia::render('syllabus_steps/Step6', [
            'isEditMode'   => true,
            'syllabusHash' => $hash,
            'sessionId'    => $syllabus->session_id,
            'step1'        => $this->safeJson($syllabus->step1),
            'step2'        => $this->safeJson($syllabus->step2),
            'step3'        => $this->safeJson($syllabus->step3),
            'step4'        => $this->safeJson($syllabus->step4),
            'step5'        => $this->safeJson($syllabus->step5),
            'step6'        => $this->safeJson($syllabus->step6),
        ]);
    }
}