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
        'syllabus_session_id',

        'step1',
        'step2',
        'step3',
        'step4',
        'step5',
        'step6',

        'final_data',

        'file_name',
        'export_format',
    ];

    /**
     * Cast JSON fields into arrays automatically
     */
    protected $casts = [
        'step1' => 'array',
        'step2' => 'array',
        'step3' => 'array',
        'step4' => 'array',
        'step5' => 'array',
        'step6' => 'array',
        'final_data' => 'array',
    ];

    /**
     * Relationship: A syllabus belongs to a professor
     */
    public function professor()
    {
        return $this->belongsTo(Professor::class);
    }
}