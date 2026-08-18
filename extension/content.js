(function () {
  function searchDeep(obj, depth = 0) {
    if (depth > 5 || !obj) return null;
    if (typeof obj === 'string') {
      if (obj.length > 20 && !obj.includes(' ') && !obj.startsWith('http')) return obj;
      return null;
    }
    if (typeof obj === 'object') {
      const priorityKeys = [
        'refreshToken',
        'refresh_token',
        'token',
        'accessToken',
        'access_token',
        'jwt',
        'sessionToken',
        'idToken',
        'authToken'
      ];
      for (const key of priorityKeys) {
        if (obj[key] && typeof obj[key] === 'string') return obj[key];
      }
      for (const k in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, k)) {
          const res = searchDeep(obj[k], depth + 1);
          if (res) return res;
        }
      }
    }
    return null;
  }

  function extractToken() {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const val = localStorage.getItem(key);
      if (!val) continue;
      if (/token|auth|session|refresh|user|persist/i.test(key)) {
        try {
          const parsed = JSON.parse(val);
          const found = searchDeep(parsed);
          if (found) return found;
        } catch (e) {
          if (val.length > 20 && !val.includes(' ')) return val;
        }
      }
    }
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const val = localStorage.getItem(key);
      try {
        const parsed = JSON.parse(val);
        const found = searchDeep(parsed);
        if (found) return found;
      } catch (e) {}
    }
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      const val = sessionStorage.getItem(key);
      try {
        const parsed = JSON.parse(val);
        const found = searchDeep(parsed);
        if (found) return found;
      } catch (e) {
        if (val && val.length > 20 && !val.includes(' ')) return val;
      }
    }
    return null;
  }

  function createFloatingButton() {
    if (document.getElementById('skylight-token-floating-helper')) return;

    const token = extractToken();
    if (!token) return;

    const banner = document.createElement('div');
    banner.id = 'skylight-token-floating-helper';
    banner.style.position = 'fixed';
    banner.style.bottom = '24px';
    banner.style.right = '24px';
    banner.style.zIndex = '9999999';
    banner.style.backgroundColor = '#1a73e8';
    banner.style.color = '#ffffff';
    banner.style.padding = '14px 20px';
    banner.style.borderRadius = '12px';
    banner.style.boxShadow = '0 8px 24px rgba(0,0,0,0.28)';
    banner.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    banner.style.fontSize = '14px';
    banner.style.fontWeight = '600';
    banner.style.cursor = 'pointer';
    banner.style.display = 'flex';
    banner.style.alignItems = 'center';
    banner.style.gap = '10px';
    banner.style.transition = 'all 0.2s ease-in-out';
    banner.innerHTML = '<span>🔑</span> <span>Copy Skylight Token for AI Agents</span>';

    banner.onmouseenter = () => { banner.style.transform = 'translateY(-2px) scale(1.02)'; };
    banner.onmouseleave = () => { banner.style.transform = 'translateY(0) scale(1)'; };

    banner.onclick = () => {
      const currentToken = extractToken();
      if (currentToken) {
        navigator.clipboard.writeText(currentToken).then(() => {
          banner.style.backgroundColor = '#1e8e3e';
          banner.innerHTML = '<span>✅</span> <span>Token Copied to Clipboard!</span>';
          setTimeout(() => {
            banner.style.backgroundColor = '#1a73e8';
            banner.innerHTML = '<span>🔑</span> <span>Copy Skylight Token for AI Agents</span>';
          }, 3500);
        }).catch(() => {
          prompt('Copy your Skylight token below:', currentToken);
        });
      }
    };

    document.body.appendChild(banner);
  }

  setInterval(createFloatingButton, 1500);
})();