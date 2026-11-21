const API_URL = import.meta.env.VITE_LEADERBOARD_API_URL?.replace(/\/$/, '') ?? '';
const PROFILE_KEY = 'piss-deal-player-profile';

const NAME_ADJECTIVES = ['Turbo', 'Frosty', 'Neon', 'Jolly', 'Rowdy', 'Toasty', 'Nordic', 'Cosmic', 'Salty', 'Tiny'];
const NAME_NOUNS = ['Goose', 'Tram', 'Pigeon', 'Slug', 'Pickle', 'Sauna', 'Potato', 'Reindeer', 'Sisu', 'Commuter'];

function generatedName() {
  const adjective = NAME_ADJECTIVES[Math.floor(Math.random() * NAME_ADJECTIVES.length)];
  const noun = NAME_NOUNS[Math.floor(Math.random() * NAME_NOUNS.length)];
  return `${adjective} ${noun} ${10 + Math.floor(Math.random() * 90)}`;
}

function newPlayerId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, symbol => {
    const value = Math.random() * 16 | 0;
    return (symbol === 'x' ? value : (value & 0x3 | 0x8)).toString(16);
  });
}

function normalizeNickname(value) {
  return Array.from(String(value ?? '').normalize('NFKC').replace(/[\p{Cc}\p{Cf}]/gu, '').replace(/\s+/gu, ' ').trim())
    .slice(0, 18).join('');
}

function readProfile() {
  try {
    const saved = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null');
    if (saved && typeof saved.id === 'string' && typeof saved.nickname === 'string') {
      return { id: saved.id, nickname: normalizeNickname(saved.nickname) || generatedName() };
    }
  } catch { /* A fresh profile still works without local storage. */ }
  return { id: newPlayerId(), nickname: generatedName() };
}

export function createLeaderboard({ nameInput, lists, startStatus, endStatus, retryButton }) {
  const profile = readProfile();
  let lastSubmission = null;
  let submitting = false;
  nameInput.value = profile.nickname;

  function saveProfile() {
    profile.nickname = normalizeNickname(nameInput.value) || profile.nickname;
    nameInput.value = profile.nickname;
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch { /* The session profile remains usable. */ }
    return profile.nickname;
  }

  function setStatuses(message) {
    startStatus.textContent = message;
    endStatus.textContent = message;
  }

  function render(entries) {
    for (const list of lists) {
      list.replaceChildren();
      if (!entries.length) {
        const empty = document.createElement('li');
        empty.className = 'leaderboard-empty';
        empty.textContent = 'No scores yet. Set the first record!';
        list.append(empty);
        continue;
      }
      for (const [index, entry] of entries.entries()) {
        const row = document.createElement('li');
        const rank = document.createElement('span');
        const nickname = document.createElement('span');
        const score = document.createElement('strong');
        row.className = 'leaderboard-row';
        rank.className = 'leaderboard-rank';
        nickname.className = 'leaderboard-name';
        score.className = 'leaderboard-score';
        rank.textContent = String(index + 1).padStart(2, '0');
        nickname.textContent = entry.nickname;
        score.textContent = Number(entry.score).toLocaleString();
        row.append(rank, nickname, score);
        list.append(row);
      }
    }
  }

  async function refresh() {
    if (!API_URL) {
      setStatuses('Online scores are not connected in this preview.');
      render([]);
      return [];
    }
    setStatuses('Loading scores…');
    try {
      const response = await fetch(`${API_URL}/leaderboard`, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`Leaderboard request failed: ${response.status}`);
      const data = await response.json();
      const entries = Array.isArray(data.entries) ? data.entries.slice(0, 5) : [];
      render(entries);
      setStatuses('');
      return entries;
    } catch {
      setStatuses('Online scores are temporarily unavailable.');
      return [];
    }
  }

  async function submit(score, wave) {
    if (submitting) return;
    const payload = {
      playerId: profile.id,
      nickname: saveProfile(),
      score: Math.max(0, Math.floor(Number(score) || 0)),
      wave: Math.max(1, Math.floor(Number(wave) || 1)),
    };
    lastSubmission = payload;
    if (!API_URL) {
      endStatus.textContent = 'Online scores are not connected in this preview.';
      retryButton.hidden = true;
      return;
    }

    submitting = true;
    retryButton.hidden = true;
    endStatus.textContent = 'Saving your score…';
    try {
      const response = await fetch(`${API_URL}/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`Score submission failed: ${response.status}`);
      endStatus.textContent = `Score saved for ${payload.nickname}.`;
      await refresh();
      endStatus.textContent = `Score saved for ${payload.nickname}.`;
    } catch {
      endStatus.textContent = 'Could not save this score. Check the connection and retry.';
      retryButton.hidden = false;
    } finally {
      submitting = false;
    }
  }

  nameInput.addEventListener('change', saveProfile);
  nameInput.addEventListener('blur', saveProfile);
  retryButton.addEventListener('click', () => {
    if (lastSubmission) submit(lastSubmission.score, lastSubmission.wave);
  });
  refresh();

  return { refresh, submit, getNickname: saveProfile };
}
