document.getElementById('copyBtn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url || !tab.url.includes('ourskylight.com')) {
    alert('Please open and log into app.ourskylight.com first!');
    return;
  }
  
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
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
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const val = localStorage.getItem(key);
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
  }, (results) => {
    if (results && results[0] && results[0].result) {
      const token = results[0].result;
      navigator.clipboard.writeText(token).then(() => {
        const status = document.getElementById('status');
        status.style.display = 'block';
        setTimeout(() => { status.style.display = 'none'; }, 3000);
      });
    } else {
      alert('Could not find token. Please ensure you are logged into Skylight.');
    }
  });
});