<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

function errandPhotoPng(): UploadedFile
{
    return UploadedFile::fake()->createWithContent(
        'errand-reference.png',
        base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=')
    );
}

it('stores an authenticated errand photo and returns its public URL', function () {
    Storage::fake('public');
    Sanctum::actingAs(User::factory()->create());

    $response = $this->post('/api/uploads/errand-photo', [
        'photo' => errandPhotoPng(),
    ], ['Accept' => 'application/json']);

    $response->assertOk()->assertJsonStructure(['url']);

    $url = $response->json('url');
    expect($url)->toContain('/storage/errand-photos/');
    Storage::disk('public')->assertExists('errand-photos/'.basename($url));
});

it('rejects unauthenticated errand photo uploads', function () {
    Storage::fake('public');

    $this->post('/api/uploads/errand-photo', [
        'photo' => errandPhotoPng(),
    ], ['Accept' => 'application/json'])->assertUnauthorized();

    expect(Storage::disk('public')->allFiles())->toBeEmpty();
});

it('rejects non-image errand photo uploads', function () {
    Storage::fake('public');
    Sanctum::actingAs(User::factory()->create());

    $this->post('/api/uploads/errand-photo', [
        'photo' => UploadedFile::fake()->createWithContent('notes.txt', 'not an image'),
    ], ['Accept' => 'application/json'])->assertUnprocessable();

    expect(Storage::disk('public')->allFiles())->toBeEmpty();
});
