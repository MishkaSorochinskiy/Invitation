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


// ── RSVP: dynamic guest name rows ──
function makeGuestRow() {
  const row = document.createElement('div');
  row.className = 'guest-name-row';
  row.innerHTML = `
    <input type="text" class="guest-name-input" placeholder="Ім'я та прізвище" autocomplete="off" autocorrect="off" autocapitalize="words" spellcheck="false" name="guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}">
    <button type="button" class="btn-remove-guest" aria-label="Видалити">×</button>`;
  row.querySelector('.btn-remove-guest').addEventListener('click', () => row.remove());
  return row;
}

document.getElementById('addGuestBtn').addEventListener('click', () => {
  document.getElementById('guestNamesList').appendChild(makeGuestRow());
});

// ── AUTOFILL from path (/uuid) or ?id= param ──
(function autofill() {
  let id = new URLSearchParams(window.location.search).get('id');
  let fromPath = false;

  if (!id) {
    id = sessionStorage.getItem('__invite_id');
    if (id) {
      sessionStorage.removeItem('__invite_id');
      fromPath = true;
    }
  }

  if (!id) return;

  // Restore clean /Invitation/uuid URL in address bar
  if (fromPath) {
    const base = location.pathname.replace(/\/$/, '');
    history.replaceState(null, '', base + '/' + id);
  }

  function parseCSVLine(line) {
    const cols = [];
    let i = 0;
    while (i < line.length) {
      if (line[i] === '"') {
        let val = ''; i++;
        while (i < line.length) {
          if (line[i] === '"' && line[i + 1] === '"') { val += '"'; i += 2; }
          else if (line[i] === '"') { i++; break; }
          else val += line[i++];
        }
        if (line[i] === ',') i++;
        cols.push(val);
      } else {
        const end = line.indexOf(',', i);
        if (end === -1) { cols.push(line.slice(i)); break; }
        cols.push(line.slice(i, end));
        i = end + 1;
      }
    }
    return cols;
  }

  fetch('guests.csv')
    .then(r => r.text())
    .then(csv => {
      const lines = csv.trim().split('\n').slice(1); // skip header
      for (const line of lines) {
        const cols = parseCSVLine(line);
        if (cols[0].trim() !== id) continue;

        const message = cols[1]?.trim() || '';
        if (message) {
          document.getElementById('guestMessage').innerHTML = message;
        }
        const names = cols.slice(2).map(n => n.trim()).filter(Boolean);
        const list = document.getElementById('guestNamesList');
        list.innerHTML = '';
        names.forEach(name => {
          const row = makeGuestRow();
          row.querySelector('.guest-name-input').value = name;
          list.appendChild(row);
        });
        break;
      }
    })
    .catch(() => {});
})();

// ── RSVP: form submit → Google Sheets ──
// Replace SHEET_URL with your deployed Apps Script web app URL
const SHEET_URL = 'https://script.google.com/macros/s/AKfycbyt7VK7bbZ-rsb3BU1f-ZOEuTBjY_8-XscXhNowH5j4PKi08dO5MBDrG7Te4z2l9GTSAw/exec';

// ── RSVP: conditional transfer question + clear errors on interaction ──
const transferGroup  = document.getElementById('transferGroup');
const transferError  = document.getElementById('transferError');
const transferInputs = document.querySelectorAll('input[name="transfer"]');

function setTransferVisible(visible) {
  if (visible) {
    transferGroup.classList.add('is-visible');
    transferGroup.setAttribute('aria-hidden', 'false');
  } else {
    transferGroup.classList.remove('is-visible');
    transferGroup.setAttribute('aria-hidden', 'true');
    transferInputs.forEach(i => { i.checked = false; });
    transferError.textContent = '';
  }
}

document.querySelectorAll('input[name="attending"]').forEach(r => {
  r.addEventListener('change', () => {
    document.getElementById('attendingError').textContent = '';
    setTransferVisible(r.value === 'yes' && r.checked);
  });
});
transferInputs.forEach(r => {
  r.addEventListener('change', () => { transferError.textContent = ''; });
});
document.getElementById('guestNamesList').addEventListener('input', () => {
  document.getElementById('guestsError').textContent = '';
});
document.getElementById('addGuestBtn').addEventListener('click', () => {
  document.getElementById('guestsError').textContent = '';
}, true);

document.getElementById('rsvpForm').addEventListener('submit', async e => {
  e.preventDefault();

  const attending = document.querySelector('input[name="attending"]:checked')?.value ?? '';
  const transfer  = document.querySelector('input[name="transfer"]:checked')?.value ?? '';
  const names = [...document.querySelectorAll('.guest-name-input')]
    .map(i => i.value.trim()).filter(Boolean);

  let valid = true;

  if (!attending) {
    document.getElementById('attendingError').textContent = 'Будь ласка, оберіть варіант';
    valid = false;
  }

  if (attending === 'yes' && !transfer) {
    transferError.textContent = 'Будь ласка, оберіть варіант';
    valid = false;
  }

  if (names.length === 0) {
    document.getElementById('guestsError').textContent = 'Будь ласка, додайте хоча б одного гостя';
    valid = false;
  }

  if (!valid) return;

  const payload = {
    attending,
    guests:   names.join(', '),
    transfer,
    message:  document.getElementById('message').value.trim(),
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
