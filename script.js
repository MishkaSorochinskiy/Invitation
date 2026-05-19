// ── INTRO ANIMATION ──
(function initIntro() {
  document.body.classList.add('intro-active');

  const overlay      = document.getElementById('intro-overlay');
  const throwArm     = document.getElementById('throw-arm');
  const envWrap      = document.getElementById('env-wrapper');
  const clickHint    = document.getElementById('click-hint');
  const mainContent  = document.getElementById('main-content');
  const speechBubble = document.getElementById('speechBubble');

  // Speech bubble appears when postman arrives at t=2800ms
  setTimeout(() => speechBubble.classList.add('visible'), 2800);

  // Arm throws at t=3100ms
  setTimeout(() => throwArm.classList.add('throwing'), 3100);

  // Envelope detaches and flies at t=3300ms
  setTimeout(() => {
    envWrap.style.opacity = '1';
    envWrap.classList.add('flying');
  }, 3300);

  // Envelope lands at t=4400ms
  setTimeout(() => {
    envWrap.classList.remove('flying');
    envWrap.classList.add('landed');
  }, 4400);

  // "Click to open" hint appears at t=4800ms
  setTimeout(() => clickHint.classList.add('visible'), 4800);

  // Click: open envelope → invitation slides up → overlay fades
  envWrap.addEventListener('click', function handler() {
    envWrap.removeEventListener('click', handler);
    clickHint.style.opacity = '0';
    speechBubble.classList.remove('visible');
    envWrap.classList.add('open');

    // Invitation card rises from envelope
    setTimeout(() => mainContent.classList.add('revealed'), 350);

    // Overlay begins fading
    setTimeout(() => overlay.classList.add('fade-out'), 600);

    // Cleanup: remove overlay, re-enable scroll, snap to top, start scroll reveal
    setTimeout(() => {
      overlay.style.display = 'none';
      document.body.classList.remove('intro-active');
      window.scrollTo(0, 0);
      document.querySelectorAll('.fade-up').forEach(el => io.observe(el));
    }, 1200);
  });
})();

// ── SCROLL-REVEAL ANIMATIONS ──
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.1 });

// ── RSVP: show/hide guest names when declining ──
document.querySelectorAll('input[name="attending"]').forEach(r => {
  r.addEventListener('change', () => {
    document.getElementById('guestNamesGroup').style.display =
      r.value === 'no' ? 'none' : 'block';
  });
});

// ── RSVP: dynamic guest name rows ──
function makeGuestRow() {
  const row = document.createElement('div');
  row.className = 'guest-name-row';
  row.innerHTML = `
    <input type="text" class="guest-name-input" placeholder="Ім'я та прізвище">
    <button type="button" class="btn-remove-guest" aria-label="Видалити">×</button>`;
  row.querySelector('.btn-remove-guest').addEventListener('click', () => row.remove());
  return row;
}

document.getElementById('addGuestBtn').addEventListener('click', () => {
  document.getElementById('guestNamesList').appendChild(makeGuestRow());
});

// ── RSVP: form submit → Google Sheets ──
// Replace SHEET_URL with your deployed Apps Script web app URL
const SHEET_URL = 'https://script.google.com/macros/s/AKfycbw0mBJqF5Odk96SU_zRREMIzZ5yfLR4_hSKW7rXSMLZ8rHu_6U5PZlJiEQAaQ_Q8jabPA/exec';

document.getElementById('rsvpForm').addEventListener('submit', async e => {
  e.preventDefault();

  const names = [...document.querySelectorAll('.guest-name-input')]
    .map(i => i.value.trim()).filter(Boolean);

  const payload = {
    name:      document.getElementById('name').value.trim(),
    attending: document.querySelector('input[name="attending"]:checked')?.value ?? '',
    guests:    names.join(', '),
    message:   document.getElementById('message').value.trim(),
  };

  if (SHEET_URL) {
    try {
      await fetch(SHEET_URL, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch (_) { /* silent — still show thank you */ }
  }

  const thankYou = document.getElementById('thankYou');
  if (payload.attending === 'no') {
    thankYou.querySelector('p').innerHTML =
      'Шкода, що не зможете бути з нами.<br>Дякуємо, що повідомили!';
  }
  document.getElementById('rsvpForm').style.display = 'none';
  thankYou.classList.add('show');
});
