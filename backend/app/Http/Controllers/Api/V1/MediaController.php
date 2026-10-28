<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MediaController extends Controller
{
    /**
     * POST /uploads/errand-photo
     * Store a reference or location photo before the errand is created.
     */
    public function uploadErrandPhoto(Request $request): JsonResponse
    {
        $request->validate([
            'photo' => ['required', 'image', 'max:10240'],
        ]);

        $path = $request->file('photo')->store('errand-photos', 'public');

        return response()->json([
            'url' => asset('storage/'.$path),
        ]);
    }
}
