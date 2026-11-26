const GAME_URL = 'https://bekharsky.github.io/piss-deal/';
const API_URL = import.meta.env.VITE_LEADERBOARD_API_URL?.replace(/\/$/, '') ?? '';

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch { /* Try the legacy clipboard path for browsers that deny clipboard access. */ }
  }

  const field = document.createElement('textarea');
  field.value = value;
  field.setAttribute('readonly', '');
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.append(field);
  field.select();
  const copied = document.execCommand('copy');
  field.remove();
  if (!copied) throw new Error('Clipboard is unavailable');
}

async function shareOrCopy(data, fallbackText, status, copiedMessage) {
  if (navigator.share) {
    try {
      await navigator.share(data);
      status.textContent = '';
      return;
    } catch (error) {
      if (error?.name === 'AbortError') return;
    }
  }

  try {
    await copyText(fallbackText);
    status.textContent = copiedMessage;
  } catch {
    status.textContent = `Copy this link: ${data.url}`;
  }
}

async function requestScoreShareUrl(result) {
  if (!API_URL) throw new Error('Score sharing is not connected in this build.');

  const response = await fetch(`${API_URL}/shares`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result),
  });
  if (!response.ok) throw new Error(`Share link request failed: ${response.status}`);

  const data = await response.json();
  const shareUrl = new URL(data?.url ?? '');
  if (shareUrl.origin !== new URL(API_URL).origin || !/^\/share\/[0-9a-f-]{36}$/i.test(shareUrl.pathname)) {
    throw new Error('Invalid score share link');
  }
  return shareUrl.href;
}

export function bindShareButtons({ gameButton, gameStatus, scoreButton, scoreStatus, getResult }) {
  let currentResultKey = '';
  let currentShareUrl = '';
  let pendingShareUrl = null;

  gameButton.addEventListener('click', async () => {
    gameButton.disabled = true;
    gameStatus.textContent = '';
    try {
      await shareOrCopy({
        title: 'Piss Deal',
        text: 'Bad Bad Boy needs you. Find all 6 sleigh parts.',
        url: GAME_URL,
      }, GAME_URL, gameStatus, 'Game link copied.');
    } finally {
      gameButton.disabled = false;
    }
  });

  scoreButton.addEventListener('click', async () => {
    scoreButton.disabled = true;
    scoreStatus.textContent = 'Creating your score card…';
    try {
      const result = getResult();
      const resultKey = JSON.stringify(result);
      if (resultKey !== currentResultKey) {
        currentResultKey = resultKey;
        currentShareUrl = '';
        pendingShareUrl = null;
      }

      if (!currentShareUrl) {
        pendingShareUrl ??= requestScoreShareUrl(result);
        try {
          currentShareUrl = await pendingShareUrl;
        } catch (error) {
          pendingShareUrl = null;
          throw error;
        }
      }

      const message = `${result.nickname} scored ${result.score.toLocaleString()} points in Piss Deal. Bad Bad Boy needs you. Find all 6 sleigh parts.`;
      await shareOrCopy({
        title: `${result.score.toLocaleString()} points in Piss Deal`,
        text: message,
        url: currentShareUrl,
      }, currentShareUrl, scoreStatus, 'Score link copied.');
    } catch (error) {
      const result = getResult();
      const fallbackUrl = GAME_URL;
      const message = `${result.nickname} scored ${result.score.toLocaleString()} points in Piss Deal. ${fallbackUrl}`;
      scoreStatus.textContent = 'Score card unavailable. Sharing the score with the game link instead.';
      try {
        if (navigator.share) {
          await navigator.share({
            title: `${result.score.toLocaleString()} points in Piss Deal`,
            text: `${result.nickname} scored ${result.score.toLocaleString()} points in Piss Deal. Bad Bad Boy needs you. Find all 6 sleigh parts.`,
            url: fallbackUrl,
          });
        } else {
          await copyText(message);
          scoreStatus.textContent = 'Score and game link copied.';
        }
      } catch (shareError) {
        if (shareError?.name === 'AbortError') scoreStatus.textContent = '';
        else {
          try {
            await copyText(message);
            scoreStatus.textContent = 'Score and game link copied.';
          } catch {
            scoreStatus.textContent = error.message || 'Could not create a score link.';
          }
        }
      }
    } finally {
      scoreButton.disabled = false;
    }
  });
}
