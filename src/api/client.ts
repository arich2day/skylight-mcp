import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export interface SkylightClientConfig {
  token?: string;
  authType?: 'bearer' | 'refresh';
  frameId?: string;
  timezone?: string;
}

export class SkylightClient {
  private api: AxiosInstance;
  public defaultFrameId?: string;
  public timezone: string;
  private token?: string;
  private authType: 'bearer' | 'refresh';

  constructor(config: SkylightClientConfig = {}) {
    this.token = config.token || process.env.SKYLIGHT_TOKEN;
    this.authType = (config.authType || process.env.SKYLIGHT_AUTH_TYPE || 'bearer') as 'bearer' | 'refresh';
    this.defaultFrameId = config.frameId || process.env.SKYLIGHT_FRAME_ID;
    this.timezone = config.timezone || process.env.SKYLIGHT_TIMEZONE || 'America/New_York';

    this.api = axios.create({
      baseURL: 'https://app.ourskylight.com',
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Skylight-MCP/2.0.0',
      },
    });

    this.api.interceptors.request.use((req) => {
      if (this.token) {
        req.headers.Authorization = `Bearer ${this.token}`;
      }
      return req;
    });
  }

  public async initialize(): Promise<void> {
    if (!this.token) {
      throw new Error(
        'SKYLIGHT_TOKEN is missing. Please capture your token from app.ourskylight.com and configure SKYLIGHT_TOKEN in your environment.'
      );
    }

    if (!this.defaultFrameId) {
      try {
        const frames = await this.getFrames();
        if (frames && frames.length > 0) {
          this.defaultFrameId = frames[0].id;
        }
      } catch (err: any) {
        console.error('[Skylight] Warning: Could not auto-detect default frame ID:', err.message);
      }
    }
  }

  private async refreshAccessToken(): Promise<boolean> {
    if (!this.token || this.authType !== 'refresh') return false;
    try {
      const res = await axios.post('https://app.ourskylight.com/oauth/token', {
        grant_type: 'refresh_token',
        refresh_token: this.token,
      }, { timeout: 10000 });

      if (res.data?.access_token) {
        this.token = res.data.access_token;
        return true;
      }
    } catch {
      // Fallback
    }
    return false;
  }

  private async request<T = any>(config: AxiosRequestConfig): Promise<T> {
    try {
      const res = await this.api.request<T>(config);
      return res.data;
    } catch (error: any) {
      if (error.response?.status === 401 && this.authType === 'refresh') {
        const refreshed = await this.refreshAccessToken();
        if (refreshed && config.headers) {
          config.headers.Authorization = `Bearer ${this.token}`;
          const retryRes = await this.api.request<T>(config);
          return retryRes.data;
        }
      }

      if (error.response?.status === 401) {
        throw new Error(
          'Skylight authentication failed (401 Unauthorized). Your token may have expired or been revoked. Please recapture your token from app.ourskylight.com.'
        );
      }
      const msg = error.response?.data?.errors?.join(', ') || error.message;
      throw new Error(`Skylight API Error: ${msg}`);
    }
  }

  // --- 1. Subscription & Profile ---
  public async getPlusAccess(): Promise<any> {
    return this.request({ method: 'GET', url: '/api/plus_access' });
  }

  public async getUser(): Promise<any> {
    return this.request({ method: 'GET', url: '/api/user' });
  }

  // --- 2. Frames & Devices ---
  public async getFrames(): Promise<any[]> {
    const res = await this.request({ method: 'GET', url: '/api/frames' });
    return Array.isArray(res) ? res : res?.data || [];
  }

  public async getFrame(frameId?: string): Promise<any> {
    const fid = frameId || this.defaultFrameId;
    return this.request({ method: 'GET', url: `/api/frames/${fid}` });
  }

  public async getDevices(frameId?: string): Promise<any> {
    const fid = frameId || this.defaultFrameId;
    return this.request({ method: 'GET', url: `/api/frames/${fid}/devices` });
  }

  // --- 3. Calendar Events ---
  public async getCalendarEvents(params?: { date_min?: string; date_max?: string; timezone?: string }, frameId?: string): Promise<any> {
    const fid = frameId || this.defaultFrameId;
    const now = new Date();
    const defaultMin = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const defaultMax = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    return this.request({
      method: 'GET',
      url: `/api/frames/${fid}/calendar_events`,
      params: {
        date_min: params?.date_min || defaultMin,
        date_max: params?.date_max || defaultMax,
        timezone: params?.timezone || this.timezone,
      },
    });
  }

  public async createCalendarEvent(eventData: any, frameId?: string): Promise<any> {
    const fid = frameId || this.defaultFrameId;
    return this.request({
      method: 'POST',
      url: `/api/frames/${fid}/calendar_events`,
      data: { calendar_event: eventData },
    });
  }

  public async updateCalendarEvent(eventId: string, eventData: any, frameId?: string): Promise<any> {
    const fid = frameId || this.defaultFrameId;
    return this.request({
      method: 'PUT',
      url: `/api/frames/${fid}/calendar_events/${eventId}`,
      data: { calendar_event: eventData },
    });
  }

  public async deleteCalendarEvent(eventId: string, frameId?: string): Promise<any> {
    const fid = frameId || this.defaultFrameId;
    return this.request({
      method: 'DELETE',
      url: `/api/frames/${fid}/calendar_events/${eventId}`,
    });
  }

  public async getCategories(frameId?: string): Promise<any> {
    const fid = frameId || this.defaultFrameId;
    return this.request({ method: 'GET', url: `/api/frames/${fid}/categories` });
  }

  // --- 4. Chores & Tasks ---
  public async getChores(params?: { after?: string; before?: string; include_late?: boolean }, frameId?: string): Promise<any> {
    const fid = frameId || this.defaultFrameId;
    return this.request({
      method: 'GET',
      url: `/api/frames/${fid}/chores`,
      params: {
        after: params?.after,
        before: params?.before,
        include_late: params?.include_late ?? true,
      },
    });
  }

  public async createChores(choresData: any[], frameId?: string): Promise<any> {
    const fid = frameId || this.defaultFrameId;
    return this.request({
      method: 'POST',
      url: `/api/frames/${fid}/chores/create_multiple`,
      data: { chores: choresData },
    });
  }

  public async updateChore(choreId: string, choreData: any, frameId?: string): Promise<any> {
    const fid = frameId || this.defaultFrameId;
    return this.request({
      method: 'PUT',
      url: `/api/frames/${fid}/chores/${choreId}`,
      data: {
        ...choreData,
        apply_to: choreData.apply_to || 'all',
      },
    });
  }

  public async deleteChore(choreId: string, frameId?: string): Promise<any> {
    const fid = frameId || this.defaultFrameId;
    return this.request({
      method: 'DELETE',
      url: `/api/frames/${fid}/chores/${choreId}`,
      data: { apply_to: 'all' },
    });
  }

  // --- 5. Lists & Groceries ---
  public async getLists(frameId?: string): Promise<any> {
    const fid = frameId || this.defaultFrameId;
    return this.request({ method: 'GET', url: `/api/frames/${fid}/lists` });
  }

  public async addListItem(listId: string, text: string, frameId?: string): Promise<any> {
    const fid = frameId || this.defaultFrameId;
    return this.request({
      method: 'POST',
      url: `/api/frames/${fid}/lists/${listId}/items`,
      data: { item: { text } },
    });
  }

  // --- 6. Meals ---
  public async getMeals(frameId?: string): Promise<any> {
    const fid = frameId || this.defaultFrameId;
    return this.request({ method: 'GET', url: `/api/frames/${fid}/meals` });
  }

  // --- 7. Rewards ---
  public async getRewards(frameId?: string): Promise<any> {
    const fid = frameId || this.defaultFrameId;
    return this.request({ method: 'GET', url: `/api/frames/${fid}/rewards` });
  }
}