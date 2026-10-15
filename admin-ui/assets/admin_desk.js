// Shared Waydrop Desk utilities
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const naira = n => (n < 0 ? '−' : '') + '₦' + Math.abs(Math.round(n)).toLocaleString('en-NG');

let tt;
function toast(t) {
  const el = $('#toast');
  if (!el) return;
  el.querySelector('span').textContent = t;
  el.classList.add('show');
  clearTimeout(tt);
  tt = setTimeout(() => el.classList.remove('show'), 2600);
}

const modal = html => {
  const m = $('#modal'), s = $('#scrim');
  if (!m || !s) return;
  m.innerHTML = html;
  s.classList.add('show');
  setTimeout(() => m.querySelector('textarea,input,button')?.focus(), 30);
};

const closeModal = () => {
  const s = $('#scrim');
  if (s) s.classList.remove('show');
};

document.addEventListener('DOMContentLoaded', () => {
  const scrim = $('#scrim');
  if (scrim) {
    scrim.addEventListener('click', e => {
      if (e.target.id === 'scrim') closeModal();
    });
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      $('#q')?.focus();
    }
  });

  const clockEl = $('#clock');
  const tick = () => {
    if (clockEl) {
      clockEl.textContent = new Date().toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' }) + ', peak hour';
    }
  };
  tick();
  setInterval(tick, 30000);
});

/* Shared reason modal */
function reasonModal(title, sub, reasons, cta, onOk, danger) {
  modal(`<h3>${title}</h3><p>${sub}</p>${reasons ? `<div class="fld"><label for="mrs">Reason</label><select id="mrs">${reasons.map(r => `<option>${r}</option>`).join('')}</select></div>` : ''}
    <div class="fld"><label for="mwhy">Note for the log ${reasons ? '(optional)' : '<span style="color:var(--fault-ink)">*</span>'}</label><textarea id="mwhy" rows="2"></textarea></div>
    <div class="mrow"><button class="btn b-line" id="mcx">Cancel</button><button class="btn ${danger ? 'b-fault' : 'b-ink'}" id="mok">${cta}</button></div>`);
  $('#mcx').onclick = closeModal;
  $('#mok').onclick = () => {
    if (!reasons && ($('#mwhy').value.trim().length < 4)) {
      $('#mwhy').focus();
      return;
    }
    onOk();
    closeModal();
  };
}
