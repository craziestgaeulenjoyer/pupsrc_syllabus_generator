<?php

namespace Database\Seeders;

use App\Models\Professor;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        Professor::create([
            'name' => 'Admin',
            'email' => 'admin@gmail.com', /* Use your email for testing purposes */
            'password' => Hash::make('admin123'),
        ]);
    }
}
