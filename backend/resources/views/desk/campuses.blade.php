<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Waydrop Desk: Campuses & Administrators</title>
<link rel="stylesheet" href="/admin_desk/admin_desk.css">
<style>
  .admin-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 24px;
  }
  @media (max-width: 900px) {
    .admin-grid { grid-template-columns: 1fr; }
  }
  .form-card {
    background: #FFFFFF;
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 22px 24px;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
  }
  .form-card h2 {
    font-size: 16px;
    font-weight: 700;
    margin: 0 0 4px 0;
    color: var(--ink1);
  }
  .form-card p {
    font-size: 13px;
    color: var(--ink2);
    margin: 0 0 16px 0;
  }
  .field-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 12px;
  }
  .field {
    margin-bottom: 12px;
  }
  .field label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: var(--ink2);
    margin-bottom: 5px;
  }
  .field input, .field select {
    width: 100%;
    padding: 9px 12px;
    border: 1px solid var(--line);
    border-radius: 8px;
    font-size: 13.5px;
    font-family: inherit;
    background: #FFFFFF;
    box-sizing: border-box;
  }
  .field input:focus, .field select:focus {
    outline: none;
    border-color: var(--brand);
  }
  .btn-action {
    background: var(--brand);
    color: #FFFFFF;
    border: none;
    padding: 10px 18px;
    border-radius: 8px;
    font-size: 13.5px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    margin-top: 6px;
  }
  .btn-action:hover {
    background: #E04B00;
  }
  .badge-hq {
    background: #EFF6FF;
    color: #1D4ED8;
    border: 1px solid #BFDBFE;
    font-size: 11px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 6px;
  }
  .badge-campus {
    background: #FEF3C7;
    color: #B45309;
    border: 1px solid #FDE68A;
    font-size: 11px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 6px;
  }
</style>
</head>
<body>
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <symbol id="logo" viewBox="0 0 40 40">
      <rect width="40" height="40" rx="12" fill="#0F172A"/>
      <path d="M8 31 C 12 31, 13 25, 18 25" stroke="#FF5500" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="1 4.2" fill="none"/>
      <path d="M24 8c5.5 0 9 3.9 9 8.6 0 5.6-5.4 9.8-9 12.4-3.6-2.6-9-6.8-9-12.4C15 11.9 18.5 8 24 8Z" fill="#FF5500"/>
      <circle cx="24" cy="16.6" r="3.2" fill="#fff"/>
    </symbol>
  </defs>
</svg>
<div class="app">
<nav aria-label="Desk">
  <div class="brand"><a href="/desk/today" style="text-decoration:none;display:flex;align-items:center;gap:10px;color:inherit;"><svg width="30" height="30" aria-hidden="true"><use href="#logo"/></svg><b>Waydrop</b><span>DESK</span></a></div>
  <a href="/desk/today" class="nlink" style="text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M240,128a8,8,0,0,1-8,8H204.94l-37.78,75.58A8,8,0,0,1,160,216h-.4a8,8,0,0,1-7.08-5.14L95.35,60.76,63.28,131.31A8,8,0,0,1,56,136H24a8,8,0,0,1,0-16H50.85L88.72,36.69a8,8,0,0,1,14.76.46l57.51,151,31.85-63.71A8,8,0,0,1,200,120h32A8,8,0,0,1,240,128Z"/></svg> Today</a>
  <a href="/desk/queue" class="nlink" style="text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M208,32H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32Z"/></svg> All open</a>
  <a href="/desk/disputes" class="nlink" style="text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M239.43,133l-32-80h0a8,8,0,0,0-9.16-4.84L136,62V40a8,8,0,0,0-16,0V65.58L54.26,80.19A8,8,0,0,0,48.57,85h0v.06L16.57,165a7.92,7.92,0,0,0-.57,3c0,23.31,24.54,32,40,32s40-8.69,40-32a7.92,7.92,0,0,0-.57-3L66.92,93.77,120,82V208H104a8,8,0,0,0,0,16h48a8,8,0,0,0,0-16H136V78.42L187,67.1,160.57,133a7.92,7.92,0,0,0-.57,3c0,23.31,24.54,32,40,32s40-8.69,40-32A7.92,7.92,0,0,0,239.43,133Z"/></svg> Disputes</a>
  <a href="/desk/kyc" class="nlink" style="text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M200,112a8,8,0,0,1-8,8H152a8,8,0,0,1,0-16h40A8,8,0,0,1,200,112Zm-8,24H152a8,8,0,0,0,0,16h40a8,8,0,0,0,0-16Z"/></svg> ID checks</a>
  <a href="/desk/locked-handovers" class="nlink" style="text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80Z"/></svg> Locked handovers</a>
  <a href="/desk/payouts" class="nlink" style="text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M24,104H48v64H32a8,8,0,0,0,0,16H224a8,8,0,0,0,0-16H208V104h24a8,8,0,0,0,4.19-14.81l-104-64a8,8,0,0,0-8.38,0l-104,64A8,8,0,0,0,24,104Z"/></svg> Failed payouts</a>
  <div class="ngrp">Campus</div>
  <a href="/desk/places" class="nlink" style="text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M112,80a16,16,0,1,1,16,16A16,16,0,0,1,112,80ZM64,80a64,64,0,0,1,128,0c0,59.95-57.58,93.54-60,94.95a8,8,0,0,1-7.94,0C121.58,173.54,64,140,64,80Z"/></svg> Places</a>
  <a href="/desk/crew" class="nlink" style="text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M168,144a40,40,0,1,1-40-40A40,40,0,0,1,168,144ZM64,56A32,32,0,1,0,96,88,32,32,0,0,0,64,56Zm128,0a32,32,0,1,0,32,32A32,32,0,0,0,192,56Z"/></svg> Crew & routines</a>
  <div class="ngrp">Control</div>
  <a href="/desk/campuses" class="nlink on" style="text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216ZM144,80a16,16,0,1,1-16-16A16,16,0,0,1,144,80Zm24,72a8,8,0,0,1-8,8H96a8,8,0,0,1,0-16h16V120a8,8,0,0,1,16,0v24h16A8,8,0,0,1,168,152Z"/></svg> 👑 Campuses & Admins</a>
  <a href="/desk/rules" class="nlink" style="text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M40,88H73a32,32,0,0,0,62,0h81a8,8,0,0,0,0-16H135a32,32,0,0,0-62,0H40a8,8,0,0,0,0,16Z"/></svg> Rules</a>
  <a href="/desk/audit" class="nlink" style="text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M168,152a8,8,0,0,1-8,8H96a8,8,0,0,1,0-16h64A8,8,0,0,1,168,152Zm-8-40H96a8,8,0,0,0,0,16h64a8,8,0,0,0,0-16Z"/></svg> Audit log</a>
  <div class="shift"><span class="av">{{ strtoupper(substr(auth()->user()->name ?? 'HQ', 0, 2)) }}</span><div style="flex:1;"><b>{{ auth()->user()->name ?? 'Super Admin' }}</b><small>{{ ucfirst(auth()->user()->role ?? 'super_admin') }} · <a href="/logout" style="color:var(--brand);text-decoration:none;font-weight:600;">Sign out</a></small></div></div>
</nav>

<main>
  <div class="top">
    <label class="search"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z"/></svg><input id="q" placeholder="Search campus, lead, or matric..." aria-label="Search"><kbd>/</kbd></label>
    
    <!-- Super Admin Campus Scope Selector -->
    <form method="POST" action="{{ route('desk.campus.switch') }}" style="display:inline-flex;margin:0;">
      @csrf
      <div class="campus" style="cursor:pointer;padding:4px 10px;">
        <span class="dotlive" style="background:#2563EB;"></span>
        <select name="campus_id" onchange="this.form.submit()" style="border:none;background:transparent;font-family:inherit;font-weight:600;font-size:12.5px;color:inherit;outline:none;cursor:pointer;">
          <option value="all" {{ empty(session('active_campus_id')) ? 'selected' : '' }}>👑 National HQ (All Campuses)</option>
          @foreach ($campuses as $c)
            <option value="{{ $c->id }}" {{ session('active_campus_id') === $c->id ? 'selected' : '' }}>🏫 {{ $c->name }}</option>
          @endforeach
        </select>
      </div>
    </form>
    
    <div style="margin-left:auto;font-size:12px;color:var(--ink3)" id="clock"></div>
  </div>

  <div class="page">
    <div class="ph">
      <div>
        <h1>National Campus Network & Administrative Staff</h1>
        <p>Headquarters desk. Provision new Nigerian university campuses and assign dedicated Campus Lead administrators.</p>
      </div>
    </div>

    @if (session('success'))
      <div style="background:#ECFDF5;border:1px solid #A7F3D0;color:#065F46;padding:12px 16px;border-radius:10px;font-size:13.5px;margin-bottom:20px;">
        ✓ {{ session('success') }}
      </div>
    @endif

    @if ($errors->any())
      <div style="background:#FEF2F2;border:1px solid #FCA5A5;color:#991B1B;padding:12px 16px;border-radius:10px;font-size:13.5px;margin-bottom:20px;">
        @foreach ($errors->all() as $error)
          <div>• {{ $error }}</div>
        @endforeach
      </div>
    @endif

    <div class="admin-grid">
      <!-- 1. Provision Campus Form -->
      <div class="form-card">
        <h2>🏫 Add New University Campus</h2>
        <p>Define geofence perimeter and campus center coordinates.</p>
        <form method="POST" action="{{ route('desk.campuses.store') }}">
          @csrf
          <div class="field-row">
            <div class="field">
              <label>Campus ID (Slug)</label>
              <input type="text" name="id" placeholder="e.g. unilag, oau, abu" required>
            </div>
            <div class="field">
              <label>Full University Name</label>
              <input type="text" name="name" placeholder="e.g. University of Lagos" required>
            </div>
          </div>
          <div class="field">
            <label>Location Subtitle</label>
            <input type="text" name="subtitle" placeholder="e.g. Main Campus, Akoka, Yaba, Lagos" required>
          </div>
          <div class="field-row">
            <div class="field">
              <label>Latitude (Lat)</label>
              <input type="text" name="lat" placeholder="e.g. 6.515800" required>
            </div>
            <div class="field">
              <label>Longitude (Lng)</label>
              <input type="text" name="lng" placeholder="e.g. 3.389800" required>
            </div>
          </div>
          <div class="field">
            <label>Geofence Radius (Meters)</label>
            <input type="number" name="radius_meters" value="3500" required>
          </div>
          <button type="submit" class="btn-action">+ Provision Campus</button>
        </form>
      </div>

      <!-- 2. Provision Campus Lead Admin -->
      <div class="form-card">
        <h2>👤 Provision Campus Lead Admin</h2>
        <p>Assign an administrator to manage a specific campus desk.</p>
        <form method="POST" action="{{ route('desk.admins.store') }}">
          @csrf
          <div class="field-row">
            <div class="field">
              <label>Admin Full Name</label>
              <input type="text" name="name" placeholder="e.g. Babatunde Fashola" required>
            </div>
            <div class="field">
              <label>Staff Email</label>
              <input type="email" name="email" placeholder="e.g. lead@unilag.waydrop.ng" required>
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <label>Phone Number</label>
              <input type="text" name="phone" placeholder="+2348012345678" required>
            </div>
            <div class="field">
              <label>Initial Password</label>
              <input type="password" name="password" placeholder="••••••••••••" required>
            </div>
          </div>
          <div class="field">
            <label>Assign to University Campus</label>
            <select name="area_id" required>
              <option value="">Select University...</option>
              @foreach ($campuses as $campus)
                <option value="{{ $campus->id }}">{{ $campus->name }} ({{ $campus->id }})</option>
              @endforeach
            </select>
          </div>
          <button type="submit" class="btn-action">+ Create Campus Lead</button>
        </form>
      </div>
    </div>

    <!-- 3. Active Campuses Table -->
    <div class="sheet" style="margin-bottom:24px;">
      <div class="sh-h">
        <b>Active University Campuses ({{ count($campuses) }})</b>
      </div>
      <table class="tbl">
        <thead>
          <tr>
            <th>Campus ID</th>
            <th>Name & Details</th>
            <th>Coordinates</th>
            <th>Radius</th>
            <th>Places</th>
            <th>Active Errands</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          @foreach ($campuses as $c)
            <tr>
              <td><code>{{ $c->id }}</code></td>
              <td><b>{{ $c->name }}</b><div style="font-size:12px;color:var(--ink3)">{{ $c->subtitle }}</div></td>
              <td><span style="font-size:12px;">{{ $c->lat }}, {{ $c->lng }}</span></td>
              <td>{{ number_format($c->radius_meters) }}m</td>
              <td>{{ $c->places_count }} places</td>
              <td>{{ $c->tasks_count }} errands</td>
              <td><span class="badge-hq">Live</span></td>
            </tr>
          @endforeach
        </tbody>
      </table>
    </div>

    <!-- 4. Administrative Staff Table -->
    <div class="sheet">
      <div class="sh-h">
        <b>Administrative Staff & Campus Leads ({{ count($admins) }})</b>
      </div>
      <table class="tbl">
        <thead>
          <tr>
            <th>Staff Name</th>
            <th>Role Tier</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Assigned University</th>
            <th>Account Created</th>
          </tr>
        </thead>
        <tbody>
          @foreach ($admins as $adm)
            <tr>
              <td><b>{{ $adm->name }}</b></td>
              <td>
                @if ($adm->isSuperAdmin())
                  <span class="badge-hq">👑 Super Admin (HQ)</span>
                @else
                  <span class="badge-campus">🏫 Campus Lead</span>
                @endif
              </td>
              <td>{{ $adm->email }}</td>
              <td>{{ $adm->phone }}</td>
              <td>
                @if ($adm->isSuperAdmin())
                  <em>All Campuses (National)</em>
                @else
                  <b>{{ $adm->area?->name ?? $adm->area_id }}</b>
                @endif
              </td>
              <td>{{ $adm->created_at->format('M d, Y') }}</td>
            </tr>
          @endforeach
        </tbody>
      </table>
    </div>

  </div>
</main>
</div>
<script src="/admin_desk/admin_desk.js"></script>
</body>
</html>
