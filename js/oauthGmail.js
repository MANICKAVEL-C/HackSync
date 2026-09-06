/**
 * Google OAuth 2.0 Secure Gmail Integration Engine
 * Uses Google Identity Services (GIS) & Gmail REST API v1 for secure read-only inbox scanning.
 * Tokens are stored strictly in-memory / sessionStorage to mitigate XSS risk.
 */

const GoogleOAuthModule = {
  SCOPE: 'https://www.googleapis.com/auth/gmail.readonly',
  tokenClient: null,
  accessToken: null,

  initOAuth(clientId) {
    const defaultClientId = '974835829792-tmr465m5jpr7rlrbncr0nsq1hd9ejlfl.apps.googleusercontent.com';
    if (window.google && window.google.accounts) {
      this.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId || defaultClientId,
        scope: this.SCOPE,
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            console.error('Google OAuth 2.0 error:', tokenResponse.error);
            alert('Google OAuth 2.0 Authorization failed: ' + tokenResponse.error);
            return;
          }
          this.accessToken = tokenResponse.access_token;
          sessionStorage.setItem('hacksync_oauth_token', this.accessToken);
          alert('🔒 Google OAuth 2.0 Connection Successful! Access token obtained securely.');
          const fetched = await this.fetchGmailMessagesViaREST();
          if (fetched && fetched.length > 0) {
            app.processFetchedHackathons(fetched);
          } else {
            alert('Connected to Gmail successfully! Inbox scanned.');
            app.renderMatches();
          }
        }
      });
    }
  },

  /**
   * Helper: Decode Base64URL string from Gmail API
   */
  decodeBase64(b64url) {
    if (!b64url) return '';
    const base64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
    try {
      return decodeURIComponent(escape(atob(base64)));
    } catch (e) {
      try {
        return atob(base64);
      } catch(err) {
        return '';
      }
    }
  },

  /**
   * Helper: Recursively extract full text from Gmail message payload
   */
  extractEmailBody(payload) {
    if (!payload) return '';
    if (payload.body && payload.body.data) {
      return this.decodeBase64(payload.body.data);
    }
    if (payload.parts && payload.parts.length > 0) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body && part.body.data) {
          return this.decodeBase64(part.body.data);
        }
      }
      for (const part of payload.parts) {
        if (part.mimeType === 'text/html' && part.body && part.body.data) {
          return this.decodeBase64(part.body.data).replace(/<[^>]*>/g, ' ');
        }
        if (part.parts) {
          const nested = this.extractEmailBody(part);
          if (nested) return nested;
        }
      }
    }
    return '';
  },

  /**
   * Request Google OAuth 2.0 Token Authorization
   */
  requestOAuthToken() {
    if (!this.tokenClient) {
      this.initOAuth();
    }
    if (this.tokenClient) {
      this.tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      alert('Unable to load Google OAuth 2.0 authorization client. Please ensure you are connected to the internet and refresh the page.');
    }
  },

  /**
   * Secure OAuth 2.0 REST API Fetcher using Bearer Access Token
   */
  async fetchGmailMessagesViaREST(token = this.accessToken) {
    if (!token) {
      token = sessionStorage.getItem('hacksync_oauth_token');
    }

    if (!token) {
      throw new Error('No active OAuth 2.0 access token found. Please click "Link Gmail Account via Secure Google OAuth 2.0".');
    }

    // Call official Gmail REST API v1: expanded search for all college competition notices
    const rawQuery = 'hackathon OR competition OR contest OR challenge OR symposium OR techfest OR circular OR event OR "project expo" OR "paper presentation" OR coding OR unstop OR devpost';
    const query = encodeURIComponent(rawQuery);
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=50`;

    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      if (res.status === 401) {
        sessionStorage.removeItem('hacksync_oauth_token');
        throw new Error('OAuth 2.0 Access Token expired. Please re-authenticate with Google.');
      }
      throw new Error(`Gmail REST API error (${res.status}): ${res.statusText}`);
    }

    const data = await res.json();
    const messages = data.messages || [];
    const fetchedHackathons = [];

    for (const msgRef of messages.slice(0, 30)) {
      const msgRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgRef.id}?format=full`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (msgRes.ok) {
        const msgData = await msgRes.json();
        const snippet = msgData.snippet || '';
        const headers = msgData.payload?.headers || [];
        const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || 'College Competition Notice';
        const fullBody = this.extractEmailBody(msgData.payload) || snippet;

        const nlpParsed = ImporterModule.parseEmailWithNLP(subject, fullBody, msgData);
        if (nlpParsed) {
          fetchedHackathons.push(nlpParsed);
        } else {
          const parsed = ImporterModule.parseRawText(subject + '\n\n' + fullBody);
          if (parsed && parsed.length > 0) {
            parsed.forEach(h => {
              fetchedHackathons.push({
                ...h,
                platform: 'Gmail OAuth 2.0',
                emailSubject: subject
              });
            });
          }
        }
      }
    }

    return fetchedHackathons;
  }
};

window.GoogleOAuthModule = GoogleOAuthModule;
