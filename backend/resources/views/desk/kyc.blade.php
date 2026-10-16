<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Waydrop Desk: ID Checks & KYC Review</title>
<link rel="stylesheet" href="/admin_desk/admin_desk.css">
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
  <a href="/desk/today" class="nlink" style="text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M96,40l33.52,88H56Zm104,88H129.52L160,208Z" opacity="0.2"/><path d="M240,128a8,8,0,0,1-8,8H204.94l-37.78,75.58A8,8,0,0,1,160,216h-.4a8,8,0,0,1-7.08-5.14L95.35,60.76,63.28,131.31A8,8,0,0,1,56,136H24a8,8,0,0,1,0-16H50.85L88.72,36.69a8,8,0,0,1,14.76.46l57.51,151,31.85-63.71A8,8,0,0,1,200,120h32A8,8,0,0,1,240,128Z"/></svg> Today</a>
  <a href="/desk/queue" class="nlink" style="text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M216,48V160H179.31a8,8,0,0,0-5.66,2.34l-19.31,19.32a8,8,0,0,1-5.66,2.34H107.31a8,8,0,0,1-5.66-2.34L82.34,162.34A8,8,0,0,0,76.68,160H40V48a8,8,0,0,1,8-8H208A8,8,0,0,1,216,48Z" opacity="0.2"/><path d="M208,32H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32Zm0,16V152h-28.7A15.86,15.86,0,0,0,168,156.69L148.69,176H107.31L88,156.68A15.89,15.89,0,0,0,76.69,152H48V48Zm0,160H48V168H76.69L96,187.32A15.89,15.89,0,0,0,107.31,192h41.38A15.86,15.86,0,0,0,160,187.31L179.31,168H208v40Z"/></svg> All open <em class="{{ ($deskBadges['openErrands'] ?? 0) > 0 ? ' hot' : '' }}">{{ $deskBadges['openErrands'] ?? 0 }}</em></a>
  <a href="/desk/disputes" class="nlink" style="text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M56,88l32,80c0,17.67-20,24-32,24s-32-6.33-32-24ZM200,56l-32,80c0,17.67,20,24,32,24s32-6.33,32-24Z" opacity="0.2"/><path d="M239.43,133l-32-80h0a8,8,0,0,0-9.16-4.84L136,62V40a8,8,0,0,0-16,0V65.58L54.26,80.19A8,8,0,0,0,48.57,85h0v.06L16.57,165a7.92,7.92,0,0,0-.57,3c0,23.31,24.54,32,40,32s40-8.69,40-32a7.92,7.92,0,0,0-.57-3L66.92,93.77,120,82V208H104a8,8,0,0,0,0,16h48a8,8,0,0,0,0-16H136V78.42L187,67.1,160.57,133a7.92,7.92,0,0,0-.57,3c0,23.31,24.54,32,40,32s40-8.69,40-32A7.92,7.92,0,0,0,239.43,133ZM56,184c-7.53,0-22.76-3.61-23.93-14.64L56,109.54l23.93,59.82C78.76,180.39,63.53,184,56,184Zm144-32c-7.53,0-22.76-3.61-23.93-14.64L200,77.54l23.93,59.82C222.76,148.39,207.53,152,200,152Z"/></svg> Disputes <em class="{{ ($deskBadges['disputes'] ?? 0) > 0 ? ' hot' : '' }}">{{ $deskBadges['disputes'] ?? 0 }}</em></a>
  <a href="/desk/kyc" class="nlink on" style="text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M216,48H40a8,8,0,0,0-8,8V200a8,8,0,0,0,8,8H216a8,8,0,0,0,8-8V56A8,8,0,0,0,216,48ZM96,144a24,24,0,1,1,24-24A24,24,0,0,1,96,144Z" opacity="0.2"/><path d="M200,112a8,8,0,0,1-8,8H152a8,8,0,0,1,0-16h40A8,8,0,0,1,200,112Zm-8,24H152a8,8,0,0,0,0,16h40a8,8,0,0,0,0-16Zm40-80V200a16,16,0,0,1-16,16H40a16,16,0,0,1-16-16V56A16,16,0,0,1,40,40H216A16,16,0,0,1,232,56ZM216,200V56H40V200H216Zm-80.26-34a8,8,0,1,1-15.5,4c-2.63-10.26-13.06-18-24.25-18s-21.61,7.74-24.25,18a8,8,0,1,1-15.5-4,39.84,39.84,0,0,1,17.19-23.34,32,32,0,1,1,45.12,0A39.76,39.76,0,0,1,135.75,166ZM96,136a16,16,0,1,0-16-16A16,16,0,0,0,96,136Z"/></svg> ID checks <em class="{{ ($deskBadges['kyc'] ?? 0) > 0 ? ' hot' : '' }}">{{ $deskBadges['kyc'] ?? 0 }}</em></a>
  <a href="/desk/locked-handovers" class="nlink" style="text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M208,88H48a8,8,0,0,0-8,8V208a8,8,0,0,0,8,8H208a8,8,0,0,0,8-8V96A8,8,0,0,0,208,88Zm-80,72a20,20,0,1,1,20-20A20,20,0,0,1,128,160Z" opacity="0.2"/><path d="M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM96,56a32,32,0,0,1,64,0V80H96ZM208,208H48V96H208V208Zm-80-96a28,28,0,0,0-8,54.83V184a8,8,0,0,0,16,0V166.83A28,28,0,0,0,128,112Zm0,40a12,12,0,1,1,12-12A12,12,0,0,1,128,152Z"/></svg> Locked handovers <em class="{{ ($deskBadges['locked'] ?? 0) > 0 ? ' hot' : '' }}">{{ $deskBadges['locked'] ?? 0 }}</em></a>
  <a href="/desk/payouts" class="nlink" style="text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M232,96H24L128,32Z" opacity="0.2"/><path d="M24,104H48v64H32a8,8,0,0,0,0,16H224a8,8,0,0,0,0-16H208V104h24a8,8,0,0,0,4.19-14.81l-104-64a8,8,0,0,0-8.38,0l-104,64A8,8,0,0,0,24,104Zm40,0H96v64H64Zm80,0v64H112V104Zm48,64H160V104h32ZM128,41.39,203.74,88H52.26ZM248,208a8,8,0,0,1-8,8H16a8,8,0,0,1,0-16H240A8,8,0,0,1,248,208Z"/></svg> Failed payouts <em class="{{ ($deskBadges['failedPayouts'] ?? 0) > 0 ? ' hot' : '' }}">{{ $deskBadges['failedPayouts'] ?? 0 }}</em></a>
  <div class="ngrp">Look up</div>
  <a href="/desk/queue" class="nlink" style="text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M128,129.09V232a8,8,0,0,1-3.84-1l-88-48.18a8,8,0,0,1-4.16-7V80.18a8,8,0,0,1,.7-3.25Z" opacity="0.2"/><path d="M223.68,66.15,135.68,18a15.88,15.88,0,0,0-15.36,0l-88,48.17a16,16,0,0,0-8.32,14v95.64a16,16,0,0,0,8.32,14l88,48.17a15.88,15.88,0,0,0,15.36,0l88-48.17a16,16,0,0,0,8.32-14V80.18A16,16,0,0,0,223.68,66.15ZM128,32l80.34,44-29.77,16.3-80.35-44ZM128,120,47.66,76l33.9-18.56,80.34,44ZM40,90l80,43.78v85.79L40,175.82Zm176,85.78h0l-80,43.79V133.82l32-17.51V152a8,8,0,0,0,16,0V107.55L216,90v85.77Z"/></svg> Errands</a>
  <a href="/desk/people" class="nlink" style="text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M224,128a95.76,95.76,0,0,1-31.8,71.37A72,72,0,0,0,128,160a40,40,0,1,0-40-40,40,40,0,0,0,40,40,72,72,0,0,0-64.2,39.37h0A96,96,0,1,1,224,128Z" opacity="0.2"/><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24ZM74.08,197.5a64,64,0,0,1,107.84,0,87.83,87.83,0,0,1-107.84,0ZM96,120a32,32,0,1,1,32,32A32,32,0,0,1,96,120Zm97.76,66.41a79.66,79.66,0,0,0-36.06-28.75,48,48,0,1,0-59.4,0,79.66,79.66,0,0,0-36.06,28.75,88,88,0,1,1,131.52,0Z"/></svg> People</a>
  <div class="ngrp">Campus</div>
  <a href="/desk/places" class="nlink" style="text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M184,80c0,56-56,88-56,88S72,136,72,80a56,56,0,0,1,112,0Z" opacity="0.2"/><path d="M112,80a16,16,0,1,1,16,16A16,16,0,0,1,112,80ZM64,80a64,64,0,0,1,128,0c0,59.95-57.58,93.54-60,94.95a8,8,0,0,1-7.94,0C121.58,173.54,64,140,64,80Zm16,0c0,42.2,35.84,70.21,48,78.5,12.15-8.28,48-36.3,48-78.5a48,48,0,0,0-96,0Zm122.77,67.63a8,8,0,0,0-5.54,15C213.74,168.74,224,176.92,224,184c0,13.36-36.52,32-96,32s-96-18.64-96-32c0-7.08,10.26-15.26,26.77-21.36a8,8,0,0,0-5.54-15C29.22,156.49,16,169.41,16,184c0,31.18,57.71,48,112,48s112-16.82,112-48C240,169.41,226.78,156.49,202.77,147.63Z"/></svg> Places <em class="{{ ($deskBadges['pendingPlaces'] ?? 0) > 0 ? ' hot' : '' }}">{{ $deskBadges['pendingPlaces'] ?? 0 }}</em></a>
  <a href="/desk/crew" class="nlink" style="text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M168,144a40,40,0,1,1-40-40A40,40,0,0,1,168,144ZM64,56A32,32,0,1,0,96,88,32,32,0,0,0,64,56Zm128,0a32,32,0,1,0,32,32A32,32,0,0,0,192,56Z" opacity="0.2"/><path d="M244.8,150.4a8,8,0,0,1-11.2-1.6A51.6,51.6,0,0,0,192,128a8,8,0,0,1,0-16,24,24,0,1,0-23.24-30,8,8,0,1,1-15.5-4A40,40,0,1,1,219,117.51a67.94,67.94,0,0,1,27.43,21.68A8,8,0,0,1,244.8,150.4ZM190.92,212a8,8,0,1,1-13.85,8,57,57,0,0,0-98.15,0,8,8,0,1,1-13.84-8,72.06,72.06,0,0,1,33.74-29.92,48,48,0,1,1,58.36,0A72.06,72.06,0,0,1,190.92,212ZM128,176a32,32,0,1,0-32-32A32,32,0,0,0,128,176ZM72,120a8,8,0,0,0-8-8A24,24,0,1,1,87.24,82a8,8,0,1,0,15.5-4A40,40,0,1,0,37,117.51,67.94,67.94,0,0,0,9.6,139.19a8,8,0,1,0,12.8,9.61A51.6,51.6,0,0,1,64,128,8,8,0,0,0,72,120Z"/></svg> Crew and routines</a>
  <div class="ngrp">Control</div>
  <a href="/desk/rules" class="nlink" style="text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M128,80a24,24,0,1,1-24-24A24,24,0,0,1,128,80Zm40,72a24,24,0,1,0,24,24A24,24,0,0,0,168,152Z" opacity="0.2"/><path d="M40,88H73a32,32,0,0,0,62,0h81a8,8,0,0,0,0-16H135a32,32,0,0,0-62,0H40a8,8,0,0,0,0,16Zm64-24A16,16,0,1,1,88,80,16,16,0,0,1,104,64ZM216,168H199a32,32,0,0,0-62,0H40a8,8,0,0,0,0,16h97a32,32,0,0,0,62,0h17a8,8,0,0,0,0-16Zm-48,24a16,16,0,1,1,16-16A16,16,0,0,1,168,192Z"/></svg> Rules</a>
  <a href="/desk/audit" class="nlink" style="text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M208,48V216a8,8,0,0,1-8,8H56a8,8,0,0,1-8-8V48a8,8,0,0,1,8-8H96a39.83,39.83,0,0,0-8,24v8h80V64a39.83,39.83,0,0,0-8-24h40A8,8,0,0,1,208,48Z" opacity="0.2"/><path d="M168,152a8,8,0,0,1-8,8H96a8,8,0,0,1,0-16h64A8,8,0,0,1,168,152Zm-8-40H96a8,8,0,0,0,0,16h64a8,8,0,0,0,0-16Zm56-64V216a16,16,0,0,1-16,16H56a16,16,0,0,1-16-16V48A16,16,0,0,1,56,32H92.26a47.92,47.92,0,0,1,71.48,0H200A16,16,0,0,1,216,48ZM96,64h64a32,32,0,0,0-64,0ZM200,48H173.25A47.93,47.93,0,0,1,176,64v8a8,8,0,0,1-8,8H88a8,8,0,0,1-8-8V64a47.93,47.93,0,0,1,2.75-16H56V216H200Z"/></svg> Audit log</a>
  @if(auth()->user()?->isSuperAdmin())
  <a href="/desk/campuses" class="nlink" style="text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216ZM144,80a16,16,0,1,1-16-16A16,16,0,0,1,144,80Zm24,72a8,8,0,0,1-8,8H96a8,8,0,0,1,0-16h16V120a8,8,0,0,1,16,0v24h16A8,8,0,0,1,168,152Z"/></svg> Campuses & Admins</a>
  @endif
  <div class="shift"><span class="av">{{ strtoupper(substr(auth()->user()->name ?? "AD", 0, 2)) }}</span><div style="flex:1;"><b>{{ auth()->user()->name ?? "Waydrop Operations" }}</b><small>{{ ucfirst(auth()->user()->role ?? "admin") }} · <a href="/logout" style="color:var(--brand);text-decoration:none;font-weight:600;">Sign out</a></small></div></div>
</nav>
  <main>
    <div class="top">
      <label class="search"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z"/></svg><input id="q" placeholder="Phone number, name, or errand reference (WD-…)" aria-label="Search"><kbd>/</kbd></label>
      @if(auth()->user()?->isSuperAdmin())
      <form method="POST" action="{{ route('desk.campus.switch') }}" style="display:inline-flex;margin:0;">
        @csrf
        <div class="campus" style="cursor:pointer;padding:4px 10px;">
          <span class="dotlive" style="background:#2563EB;"></span>
          <select name="campus_id" onchange="this.form.submit()" style="border:none;background:transparent;font-family:inherit;font-weight:600;font-size:12.5px;color:inherit;outline:none;cursor:pointer;">
            <option value="all" {{ empty(session('active_campus_id')) ? 'selected' : '' }}>National HQ (All Campuses)</option>
            @foreach (\App\Models\Area::all() as $c)
              <option value="{{ $c->id }}" {{ session('active_campus_id') === $c->id ? 'selected' : '' }}>🏫 {{ $c->name }}</option>
            @endforeach
          </select>
        </div>
      </form>
      @else
      <div class="campus"><span class="dotlive"></span> {{ auth()->user()?->area?->name ?? 'BUK New Site' }}</div>
      @endif
      <div style="margin-left:auto;font-size:12px;color:var(--ink3)" id="clock"></div>
    </div>
    <div class="page">
      @if(session('success'))
        <div style="background:#ECFDF5;border:1px solid #A7F3D0;color:#065F46;padding:12px 16px;border-radius:10px;font-size:13.5px;margin-bottom:16px;">
          ✓ {{ session('success') }}
        </div>
      @endif

      @if($verifications->count() > 1)
        <div style="margin-bottom:14px;display:flex;align-items:center;gap:10px;">
          <span style="font-size:12px;color:var(--ink3);font-weight:600;">SWITCH APPLICANT:</span>
          <select onchange="location.href='/desk/kyc?id='+this.value" style="padding:6px 12px;border:1px solid var(--border);border-radius:8px;font-family:inherit;font-size:13px;background:var(--sheet);color:var(--ink1);">
            @foreach($verifications as $v)
              <option value="{{ $v->id }}" {{ ($selectedKyc?->id === $v->id) ? 'selected' : '' }}>
                {{ $v->user?->name }} ({{ $v->matric_number ?? $v->status }})
              </option>
            @endforeach
          </select>
        </div>
      @endif

      @if(!$selectedKyc)
        <div class="sheet" style="padding:60px 20px;text-align:center;">
          <div style="font-size:36px;margin-bottom:12px;">🪪</div>
          <h2>No Pending ID Checks</h2>
          <p style="color:var(--ink2);margin-top:6px;">All runner KYC submissions for this campus have been reviewed.</p>
          <a href="/desk/queue" class="btn b-line" style="display:inline-flex;margin-top:16px;text-decoration:none;">Return to Queue</a>
        </div>
      @else
        <div class="ph">
          <div>
            <a href="/desk/queue" class="btn b-line" style="margin-bottom:10px;text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M228,128a12,12,0,0,1-12,12H69l51.52,51.51a12,12,0,0,1-17,17l-72-72a12,12,0,0,1,0-17l72-72a12,12,0,0,1,17,17L69,116H216A12,12,0,0,1,228,128Z"/></svg> Queue</a>
            <h1>ID check: {{ $selectedKyc->user?->name ?? 'Applicant' }}</h1>
            <p>Biometric confidence: <b>{{ $selectedKyc->biometric_confidence ?? 92 }}%</b> · Provider: {{ ucfirst($selectedKyc->biometric_provider ?? 'Smile ID') }} · Campus: {{ $selectedKyc->campus?->name ?? 'Campus' }}</p>
          </div>
          <span class="chip {{ $selectedKyc->status === 'approved' ? 'c-paid' : 'c-held' }}">{{ ucfirst($selectedKyc->status) }}</span>
        </div>

        <div class="kyc">
          {{-- Student ID Card --}}
          <div class="sheet">
            <div class="sh-h"><b>Student ID Document</b><small>Uploaded {{ $selectedKyc->created_at?->diffForHumans() ?? 'recently' }}</small></div>
            <div class="idimg">
              <div class="idcard">
                <div class="st">{{ strtoupper($selectedKyc->campus?->name ?? 'UNIVERSITY OF LAGOS') }} · STUDENT</div>
                <div class="ph2"></div>
                <div class="ln2">
                  <b>{{ strtoupper($selectedKyc->user?->name ?? 'STUDENT NAME') }}</b>
                  <span>Mat. No: {{ $selectedKyc->matric_number ?? 'N/A' }}</span>
                  <span>{{ $selectedKyc->faculty ?? 'Faculty' }} · {{ $selectedKyc->department ?? 'Dept' }}</span>
                  <span>Status: {{ ucfirst($selectedKyc->status) }}</span>
                </div>
              </div>
            </div>
          </div>

          {{-- Selfie Card --}}
          <div class="sheet">
            <div class="sh-h"><b>Live Facial Match</b><small>{{ $selectedKyc->biometric_liveness_passed ? 'Liveness passed' : 'Liveness check pending' }}</small></div>
            <div class="idimg">
              <div class="selfie">
                <div class="face"></div>
              </div>
            </div>
          </div>

          {{-- Verification Checks & Decision --}}
          <div class="sheet">
            <div class="sh-h"><b>Automated Checks</b></div>
            <div style="padding:4px 16px 16px">
              <table class="cmp">
                <tr><td>Name on account</td><td>{{ $selectedKyc->user?->name }}</td></tr>
                <tr><td>Name on payout bank</td><td>{{ $selectedKyc->payout_account_name ?? $selectedKyc->user?->name }}</td></tr>
                <tr><td>Matric number</td><td class="ok-i">{{ $selectedKyc->matric_number ?? 'Verified' }}</td></tr>
                <tr><td>Biometric provider</td><td class="ok-i">{{ ucfirst($selectedKyc->biometric_provider ?? 'Smile ID') }}</td></tr>
                <tr><td>Face match confidence</td><td class="ok-i">{{ $selectedKyc->biometric_confidence ?? 95 }}%</td></tr>
                <tr><td>Liveness check</td><td class="ok-i">{{ $selectedKyc->biometric_liveness_passed ? 'Passed ✓' : 'Flagged' }}</td></tr>
                <tr><td>Campus geofence</td><td class="ok-i">{{ $selectedKyc->campus?->name ?? 'Verified' }}</td></tr>
              </table>

              @if($selectedKyc->rejection_reason)
                <p class="note" style="color:var(--fault-ink);background:var(--fault-wash);padding:8px 12px;border-radius:6px;margin-top:10px;">
                  Previous note: {{ $selectedKyc->rejection_reason }}
                </p>
              @endif

              <div style="display:flex;flex-direction:column;gap:10px;margin-top:16px">
                <form method="POST" action="{{ route('desk.kyc.review', $selectedKyc->id) }}">
                  @csrf
                  <input type="hidden" name="decision" value="approve">
                  <button type="submit" class="btn b-paid" style="justify-content:center;height:40px;width:100%;">
                    <svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M232.49,80.49l-128,128a12,12,0,0,1-17,0l-56-56a12,12,0,1,1,17-17L96,183,215.51,63.51a12,12,0,0,1,17,17Z"/></svg> Approve Runner
                  </button>
                </form>

                <form method="POST" action="{{ route('desk.kyc.review', $selectedKyc->id) }}">
                  @csrf
                  <input type="hidden" name="decision" value="reject">
                  <input type="text" name="rejection_reason" placeholder="Reason to reject (shown to student in app)" required style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:8px;font-family:inherit;font-size:13px;margin-bottom:8px;">
                  <button type="submit" class="btn b-fault" style="justify-content:center;width:100%;">
                    Reject Applicant
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      @endif
    </div>
  </main>
</div>

<script src="/admin_desk/admin_desk.js"></script>
</body>
</html>
