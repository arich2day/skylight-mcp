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
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Skylight/2.0.0 (MCP Server)',
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
        'SKYLIGHT_TOKEN is required. Please capture your token from app.ourskylight.com and set SKYLIGHT_TOKEN in your environment.'
      );
    }

    if (!this.defaultFrameId) {
      try {
        const frames = await this.getFrames();
        if (frames && frames.length > 0) {
          this.defaultFrameId = frames[0].id;
        }
      } catch (err: any) {
        console.warn('Could not auto-fetch default frame ID:', err.message);
      }
    }
  }

  private async request<T = any>(config: AxiosRequestConfig): Promise<T> {
    try {
      const res = await this.api.request<T>(config);
      return res.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error(
          'Skylight authentication failed (401 Unauthorized). Your token may have expired or been revoked. Please recapture your token from app.ourskylight.com.'
        );
      }
      const msg = error.response?.data?.errors?.join(', ') || error.message;
      throw new Error(`Skylight API Error: ${msg}`);
    }
  }

  // --- 1. Subscription & Account ---
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
    return this.request({
      method: 'GET',
      url: `/api/frames/${fid}/calendar_events`,
      params: {
        date_min: params?.date_min,
        date_max: params?.date_max,
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
      data: choreData,
    });
  }

  public async deleteChore(choreId: string, frameId?: string): Promise<any> {
    const fid = frameId || this.defaultFrameId;
    return this.request({
      method: 'DELETE',
      url: `/api/frames/${fid}/chores/${choreId}`,
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

  // --- 6. Meals & Recipes ---
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