// ============================================================
// CulinaryOS — Display Platform Domain Types
// Device registration, pairing, modes, remote management & playlists
// ============================================================

export type DisplayPlatform = 'android_tv' | 'web' | 'tablet' | 'browser' | 'unknown';

export type DisplayMode = 'kitchen' | 'manager' | 'staff' | 'guest' | 'pickup' | 'marketing';

export type DisplayBrand = 'culinaryos' | 'cheezies';

export interface DisplayRemoteCommand {
  type: 'navigate' | 'refresh' | 'reboot' | 'reconfigure';
  mode?: DisplayMode;
  view?: string;
  payload?: Record<string, unknown>;
  commandId: string;
  issuedAt: number;
}

export interface DisplayConfiguration {
  theme?: 'classic-light' | 'midnight-dark' | 'kitchen-oled' | 'cheezies-gold' | 'cheezies-dark' | string;
  brand?: DisplayBrand;
  stationId?: string;
  stationName?: string;
  playlistId?: string;
  showAllergens?: boolean;
  warningMinutes?: number;
  criticalMinutes?: number;
  autoAdvanceSeconds?: number;
  customTitle?: string;
  showClock?: boolean;
  soundAlerts?: boolean;
  remoteCommand?: DisplayRemoteCommand;
  metadata?: Record<string, unknown>;
}

export interface DisplayDevice {
  id: string;
  tenantId: string;
  locationId?: string | null | undefined;
  name: string;
  pairingCode?: string | null | undefined;
  deviceToken?: string | null | undefined;
  deviceType: string;
  platform: DisplayPlatform;
  appVersion: string;
  assignedMode: DisplayMode;
  assignedView: string;
  configuration: DisplayConfiguration;
  isPaired?: boolean | undefined;
  pairedAt?: string | null | undefined;
  lastSeenAt: string;
  online: boolean;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface DisplayPairingRequest {
  pairingCode: string;
  name: string;
  assignedMode: DisplayMode;
  assignedView?: string;
  locationId?: string | null | undefined;
  configuration?: Partial<DisplayConfiguration>;
}

export interface DisplayHeartbeatPayload {
  deviceToken: string;
  appVersion?: string;
  currentMode?: DisplayMode;
  currentView?: string;
  connectionQuality?: 'excellent' | 'good' | 'poor' | 'offline';
  lastError?: string | null | undefined;
  batteryPercent?: number | null | undefined;
}

export interface DisplayHeartbeatResponse {
  acknowledged: boolean;
  online: boolean;
  assignedMode: DisplayMode;
  assignedView: string;
  configuration: DisplayConfiguration;
  remoteCommand?: DisplayRemoteCommand | null | undefined;
  serverTime: string;
}

export interface DisplayPlaylistItem {
  id: string;
  type: 'featured' | 'special' | 'event' | 'photo' | 'video' | 'announcement' | 'qr' | 'loyalty' | 'menu';
  title: string;
  subtitle?: string;
  description?: string;
  priceCents?: number;
  imageUrl?: string;
  qrCodeUrl?: string;
  durationSeconds: number;
  startDate?: string;
  endDate?: string;
  daysOfWeek?: number[];
  startTime?: string;
  endTime?: string;
  priority?: number;
}

export interface DisplayPlaylist {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  isActive: boolean;
  items: DisplayPlaylistItem[];
  schedule?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface DisplayThemeTokens {
  logo?: string;
  brandTitle: string;
  primaryBrand: string;
  background: string;
  cardBg: string;
  textColor: string;
  accentColor: string;
  layoutDensity: 'comfortable' | 'compact' | 'oversized';
}
