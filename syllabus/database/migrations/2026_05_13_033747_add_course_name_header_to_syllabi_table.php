<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Adds a dedicated `course_name_header` column to the `syllabi` table.
     */
    public function up(): void
    {
        Schema::table('syllabi', function (Blueprint $table) {
            $table->string('course_name_header')->nullable()->after('course_title');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('syllabi', function (Blueprint $table) {
            $table->dropColumn('course_name_header');
        });
    }
};