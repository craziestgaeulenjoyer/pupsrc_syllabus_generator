<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('syllabi', function (Blueprint $table) {
            $table->unsignedBigInteger('professor_id')->after('id');

            // Foreign key
            $table->foreign('professor_id')
                  ->references('id')
                  ->on('professors')
                  ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::table('syllabi', function (Blueprint $table) {
            $table->dropForeign(['professor_id']);
            $table->dropColumn('professor_id');
        });
    }
};
