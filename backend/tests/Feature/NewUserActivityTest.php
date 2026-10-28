<?php

namespace Tests\Feature;

use App\Models\Area;
use App\Models\Place;
use App\Models\Task;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NewUserActivityTest extends TestCase
{
    use RefreshDatabase;

    protected Area $area;

    protected function setUp(): void
    {
        parent::setUp();

        $this->area = Area::firstOrCreate(
            ['id' => 'buk-new'],
            [
                'name' => 'BUK New Site',
                'subtitle' => 'Main Campus, Kano',
                'lat' => 11.980560,
                'lng' => 8.479440,
                'radius_meters' => 3500,
                'is_active' => true,
            ]
        );

        Place::create([
            'id' => 'p1',
            'area_id' => 'buk-new',
            'name' => 'Library',
            'kind' => 'library',
            'lat' => 11.980560,
            'lng' => 8.479440,
        ]);

        Place::create([
            'id' => 'p2',
            'area_id' => 'buk-new',
            'name' => 'Hostel',
            'kind' => 'hostel',
            'lat' => 11.981000,
            'lng' => 8.480000,
        ]);
    }

    public function test_new_user_has_zero_activity_and_empty_history_on_home(): void
    {
        $user = User::create([
            'phone' => '+2348011112222',
            'first_name' => 'Audu',
            'last_name' => 'Manga',
            'area_id' => 'buk-new',
            'role' => 'user',
            'runner_status' => 'unverified',
        ]);

        Wallet::create([
            'user_id' => $user->id,
            'balance_kobo' => 0,
            'escrow_kobo' => 0,
        ]);

        $token = $user->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/home?site=buk-new');

        $response->assertStatus(200);
        $data = $response->json();

        $this->assertEquals(0, $data['balance']);
        $this->assertEquals(0, $data['escrow']);
        $this->assertNull($data['active_task']);
        $this->assertSame([], $data['send_again']);
        $this->assertSame([], $data['saved_places']);
    }

    public function test_home_radar_does_not_invent_runner_or_errand_activity(): void
    {
        $user = User::create([
            'phone' => '+2348011115555',
            'first_name' => 'Audu',
            'last_name' => 'Manga',
            'area_id' => 'buk-new',
            'role' => 'user',
            'runner_status' => 'unverified',
        ]);

        $token = $user->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/home?site=buk-new');

        $response->assertStatus(200);
        $data = $response->json();

        $this->assertSame(0, $data['runners_nearby']);
        $this->assertSame([], $data['runners']);
        $this->assertSame([], $data['busy_spots']);
        $this->assertSame([], $data['routes']);

        $this->assertCount(2, $data['places']);

        $library = collect($data['places'])->firstWhere('name', 'Library');
        $this->assertNotNull($library);
        $this->assertEqualsWithDelta(11.980560, $library['lat'], 0.000001);
        $this->assertEqualsWithDelta(8.479440, $library['lng'], 0.000001);
    }

    public function test_user_with_active_task_sees_it_on_home(): void
    {
        $user = User::create([
            'phone' => '+2348011113333',
            'first_name' => 'Audu',
            'last_name' => 'Manga',
            'area_id' => 'buk-new',
            'role' => 'user',
            'runner_status' => 'unverified',
        ]);

        $task = Task::create([
            'id' => 'WD-ACTIVE1',
            'area_id' => 'buk-new',
            'requester_id' => $user->id,
            'type' => 'buy',
            'item' => 'Scientific Calculator',
            'pickup_name' => 'Moremi Hall',
            'dropoff_name' => 'LT3',
            'pickup_lat' => 11.980560,
            'pickup_lng' => 8.479440,
            'dropoff_lat' => 11.981000,
            'dropoff_lng' => 8.480000,
            'bounty_kobo' => 50000,
            'budget_kobo' => 30000,
            'status' => 'in_transit',
            'pin_code' => '1234',
        ]);

        $token = $user->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/home?site=buk-new');

        $response->assertStatus(200);
        $data = $response->json();

        $this->assertNotNull($data['active_task']);
        $this->assertEquals($task->id, $data['active_task']['id']);
        $this->assertEquals('Scientific Calculator', $data['active_task']['item']);
        $this->assertEquals('Moremi Hall', $data['active_task']['from']);
        $this->assertEquals('LT3', $data['active_task']['to']);
        $this->assertSame('buy', $data['active_task']['type']);
        $this->assertTrue($data['active_task']['is_buy']);
    }

    public function test_user_with_completed_tasks_sees_send_again(): void
    {
        $user = User::create([
            'phone' => '+2348011114444',
            'first_name' => 'Audu',
            'last_name' => 'Manga',
            'area_id' => 'buk-new',
            'role' => 'user',
            'runner_status' => 'unverified',
        ]);

        Task::create([
            'id' => 'WD-PAST1',
            'area_id' => 'buk-new',
            'requester_id' => $user->id,
            'item' => 'Textbook',
            'pickup_name' => 'Library',
            'dropoff_name' => 'Hostel',
            'pickup_lat' => 11.980560,
            'pickup_lng' => 8.479440,
            'dropoff_lat' => 11.981000,
            'dropoff_lng' => 8.480000,
            'bounty_kobo' => 60000,
            'status' => 'completed',
            'pin_code' => '1234',
        ]);

        $token = $user->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/home?site=buk-new');

        $response->assertStatus(200);
        $data = $response->json();

        $this->assertCount(1, $data['send_again']);
        $this->assertEquals('Textbook', $data['send_again'][0]['item']);
    }
}
