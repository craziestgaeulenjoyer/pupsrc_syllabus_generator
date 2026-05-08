<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Syllabus extends Model
{
    use HasFactory;

    protected $table = 'syllabi';

    protected $fillable = [
        'professor_id',
        'session_id',           // matches the actual DB column name

        'course_code',
        'course_title',

        'step1',
        'step2',
        'step3',
        'step4',
        'step5',
        'step6',

        'final_data',           // text column — stored as JSON string

        'file_name',
        'export_format',
    ];

    /**
     * Cast JSON columns into arrays automatically.
     * Note: final_data is a plain text column so it is NOT cast here —
     * the controller encodes/decodes it manually.
     */
    protected $casts = [
        'step1' => 'array',
        'step2' => 'array',
        'step3' => 'array',
        'step4' => 'array',
        'step5' => 'array',
        'step6' => 'array',
    ];

    /**
     * Relationship: A syllabus belongs to a professor
     */
    public function professor()
    {
        return $this->belongsTo(Professor::class);
    }
}