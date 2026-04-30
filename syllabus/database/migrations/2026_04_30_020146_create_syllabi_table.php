<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
    {
        Schema::create('syllabi', function (Blueprint $table) {
            $table->id();

            // session tracking
            $table->string('session_id')->unique();

            // Optional relational info
            $table->string('course_code')->nullable();
            $table->string('course_title')->nullable();

            // Store each step as JSON
            $table->json('step1')->nullable();
            $table->json('step2')->nullable();
            $table->json('step3')->nullable();
            $table->json('step4')->nullable();
            $table->json('step5')->nullable();
            $table->json('step6')->nullable();

            // Final merged data (for export)
            $table->longText('final_data')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('syllabi');
    }
};
