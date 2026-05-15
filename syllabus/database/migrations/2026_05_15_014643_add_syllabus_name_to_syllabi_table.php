<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('syllabi', function (Blueprint $table) {
            $table->string('syllabus_name')->nullable()->after('course_title');
        });
 
        DB::statement("
            UPDATE syllabi
            SET syllabus_name = course_title
            WHERE syllabus_name IS NULL
              AND course_title IS NOT NULL
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('syllabi', function (Blueprint $table) {
            $table->dropColumn('syllabus_name');
        });
    }
};
