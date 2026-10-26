// ============================================================
// CulinaryOS — In-Memory Display Device Store for Demo / Offline
// Powers Display Platform pairing, remote management & projections
// ============================================================

import type {
  DisplayDevice,
  DisplayMode,
  DisplayPlatform,
  DisplayPairingRequest,
  DisplayHeartbeatPayload,
  DisplayHeartbeatResponse,
  DisplayConfiguration,
  DisplayPlaylistItem,
  DisplayRemoteCommand,
} from '@culinaryos/shared';
import { getMockTickets, getMock86Items } from './mock-kitchen.js';
import { CHEEZIES_MENU_ITEMS, CHEEZIES_COMPANY_INFO } from '@culinaryos/shared';

const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000001';

const mockDisplays = new Map<string, DisplayDevice>();

const INITIAL_DISPLAYS: DisplayDevice[] = [
  {
    id: 'disp-kds-01',
    tenantId: DEMO_TENANT_ID,
    locationId: 'loc-main-kitchen',
    name: 'Main Kitchen Line KDS',
    pairingCode: '111222',
    deviceToken: 'dt-kitchen-prod-kds-01',
    deviceType: 'android_tv',
    platform: 'android_tv',
    appVersion: '1.2.0',
    assignedMode: 'kitchen',
    assignedView: 'all',
    configuration: {
      theme: 'kitchen-oled',
      brand: 'culinaryos',
      stationId: 'all',
      stationName: 'All Stations',
      showAllergens: true,
      warningMinutes: 8,
      criticalMinutes: 15,
      soundAlerts: true,
      showClock: true,
    },
    pairedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    lastSeenAt: new Date().toISOString(),
    online: true,
    enabled: true,
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'disp-cheezies-ops-01',
    tenantId: DEMO_TENANT_ID,
    locationId: 'loc-food-truck-01',
    name: 'Cheezies Truck Ops Screen',
    pairingCode: '726419',
    deviceToken: 'dt-cheezies-truck-ops-01',
    deviceType: 'android_tv',
    platform: 'android_tv',
    appVersion: '1.2.0',
    assignedMode: 'kitchen',
    assignedView: 'truck_ops',
    configuration: {
      theme: 'cheezies-gold',
      brand: 'cheezies',
      stationId: 'grill',
      stationName: 'Cheezies Melt Station',
      showAllergens: true,
      warningMinutes: 6,
      criticalMinutes: 12,
      soundAlerts: true,
      showClock: true,
    },
    pairedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    lastSeenAt: new Date().toISOString(),
    online: true,
    enabled: true,
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'disp-cheezies-menu-01',
    tenantId: DEMO_TENANT_ID,
    locationId: 'loc-food-truck-01',
    name: 'Cheezies Customer Menu Board',
    pairingCode: '334455',
    deviceToken: 'dt-cheezies-customer-menu-01',
    deviceType: 'android_tv',
    platform: 'android_tv',
    appVersion: '1.2.0',
    assignedMode: 'guest',
    assignedView: 'customer_menu',
    configuration: {
      theme: 'cheezies-gold',
      brand: 'cheezies',
      customTitle: 'Cheezies Handcrafted Artisan Melts',
      showClock: false,
    },
    pairedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    lastSeenAt: new Date().toISOString(),
    online: true,
    enabled: true,
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

for (const d of INITIAL_DISPLAYS) {
  mockDisplays.set(d.id, d);
}

export function getMockDisplays(tenantId?: string): DisplayDevice[] {
  const all = Array.from(mockDisplays.values());
  if (!tenantId) return all;
  return all.filter((d) => d.tenantId === tenantId);
}

export function getMockDisplayById(id: string): DisplayDevice | undefined {
  return mockDisplays.get(id);
}

export function getMockDisplayByToken(token: string): DisplayDevice | undefined {
  for (const d of mockDisplays.values()) {
    if (d.deviceToken === token) return d;
  }
  return undefined;
}

export function getMockDisplayByPairingCode(code: string): DisplayDevice | undefined {
  const cleanCode = code.replace(/\s+/g, '');
  for (const d of mockDisplays.values()) {
    if (d.pairingCode && d.pairingCode.replace(/\s+/g, '') === cleanCode) return d;
  }
  return undefined;
}

export function registerMockDisplay(payload: {
  deviceType?: string;
  platform?: DisplayPlatform;
  appVersion?: string;
  hardwareModel?: string;
}): { device: DisplayDevice; pairingCode: string } {
  const id = `disp-${Math.random().toString(36).substring(2, 9)}`;
  // Generate 6 digit code e.g. 726419
  const pairingCode = Math.floor(100000 + Math.random() * 900000).toString();
  const deviceToken = `dt-${Math.random().toString(36).substring(2, 12)}`;

  const device: DisplayDevice = {
    id,
    tenantId: DEMO_TENANT_ID,
    name: payload.hardwareModel ? `Android TV (${payload.hardwareModel})` : 'New Android TV Display',
    pairingCode,
    deviceToken,
    deviceType: payload.deviceType || 'android_tv',
    platform: payload.platform || 'android_tv',
    appVersion: payload.appVersion || '1.0.0',
    assignedMode: 'kitchen',
    assignedView: 'all',
    configuration: {
      theme: 'kitchen-oled',
      brand: 'culinaryos',
      showAllergens: true,
      warningMinutes: 8,
      criticalMinutes: 15,
      showClock: true,
    },
    pairedAt: null,
    lastSeenAt: new Date().toISOString(),
    online: true,
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  mockDisplays.set(id, device);
  return { device, pairingCode };
}

export function pairMockDisplay(
  pairingCode: string,
  req: DisplayPairingRequest,
  tenantId: string
): DisplayDevice | null {
  const device = getMockDisplayByPairingCode(pairingCode);
  if (!device) return null;

  device.tenantId = tenantId;
  device.name = req.name || device.name;
  device.assignedMode = req.assignedMode;
  device.assignedView = req.assignedView || 'all';
  device.locationId = req.locationId || device.locationId;
  device.pairedAt = new Date().toISOString();
  device.pairingCode = null; // Consume pairing code
  device.online = true;
  device.lastSeenAt = new Date().toISOString();
  device.updatedAt = new Date().toISOString();

  if (req.configuration) {
    device.configuration = {
      ...device.configuration,
      ...req.configuration,
    };
  }

  mockDisplays.set(device.id, device);
  return device;
}

export function updateMockDisplayHeartbeat(
  token: string,
  payload: DisplayHeartbeatPayload
): DisplayHeartbeatResponse | null {
  const device = getMockDisplayByToken(token);
  if (!device) return null;

  device.lastSeenAt = new Date().toISOString();
  device.online = true;
  if (payload.appVersion) device.appVersion = payload.appVersion;
  device.updatedAt = new Date().toISOString();

  const command = device.configuration.remoteCommand;
  // If remote command was delivered recently, we return it
  const remoteCommand = command && (Date.now() - command.issuedAt < 60000) ? command : null;

  return {
    acknowledged: true,
    online: true,
    assignedMode: device.assignedMode,
    assignedView: device.assignedView,
    configuration: device.configuration,
    remoteCommand,
    serverTime: new Date().toISOString(),
  };
}

export function updateMockDisplay(
  id: string,
  updates: Partial<DisplayDevice> & { remoteCommand?: DisplayRemoteCommand }
): DisplayDevice | null {
  const device = mockDisplays.get(id);
  if (!device) return null;

  if (updates.name !== undefined) device.name = updates.name;
  if (updates.assignedMode !== undefined) device.assignedMode = updates.assignedMode;
  if (updates.assignedView !== undefined) device.assignedView = updates.assignedView;
  if (updates.locationId !== undefined) device.locationId = updates.locationId;
  if (updates.enabled !== undefined) device.enabled = updates.enabled;
  if (updates.configuration) {
    device.configuration = {
      ...device.configuration,
      ...updates.configuration,
    };
  }
  if (updates.remoteCommand) {
    device.configuration = {
      ...device.configuration,
      remoteCommand: {
        ...updates.remoteCommand,
        commandId: updates.remoteCommand.commandId || `cmd-${Date.now()}`,
        issuedAt: updates.remoteCommand.issuedAt || Date.now(),
      },
    };
  }
  device.updatedAt = new Date().toISOString();

  mockDisplays.set(device.id, device);
  return device;
}

export function deleteMockDisplay(id: string): boolean {
  return mockDisplays.delete(id);
}

// Projection Data Generation for Display Modes
export async function getDisplayProjectionData(
  mode: DisplayMode,
  view: string,
  tenantId: string,
  brand: string = 'culinaryos'
): Promise<Record<string, unknown>> {
  const isCheezies = brand === 'cheezies' || view.includes('cheezies');

  switch (mode) {
    case 'kitchen': {
      const tickets = getMockTickets();
      const items86 = getMock86Items();
      // Filter by station if view is specific
      let filteredTickets = tickets;
      if (view && view !== 'all' && view !== 'expo' && view !== 'truck_ops') {
        filteredTickets = tickets.filter(
          (t) => t.station === view || t.items?.some((i) => i.station === view)
        );
      }

      const active = filteredTickets.filter((t) => t.status !== 'bumped' && t.status !== 'voided');

      return {
        mode: 'kitchen',
        view,
        brand: isCheezies ? 'cheezies' : 'culinaryos',
        station: view,
        activeCount: active.length,
        avgTicketSeconds: 434, // 07:14
        oldestTicketSeconds: 762, // 12:42
        readyCount: 3,
        tickets: active.map((t) => ({
          id: t.id,
          orderId: t.order_id,
          orderNumber: t.order_number || (t.id ? parseInt(t.id.replace(/\D/g, ''), 10) || 1024 : 1024),
          tableNumber: t.table_number || 'Takeout',
          orderType: t.table_number ? 'DINE IN' : 'TAKEOUT',
          station: t.station,
          status: t.status,
          courseNumber: t.course_number || 1,
          courseHoldStatus: t.course_hold_status || 'fired',
          priority: t.priority || (t.items?.some((i) => i.notes?.toLowerCase().includes('allergy')) ? 'allergy' : 'normal'),
          allergyFlag: t.items?.find((i) => i.notes?.toLowerCase().includes('allergy'))?.notes || null,
          createdAt: t.created_at,
          firedAt: t.fired_at || t.created_at,
          elapsedSeconds: Math.floor((Date.now() - new Date(t.fired_at || t.created_at).getTime()) / 1000),
          items: (t.items || []).map((i) => ({
            id: i.id,
            name: i.name,
            quantity: i.quantity,
            modifiers: i.modifiers || [],
            notes: i.notes || null,
            station: i.station || t.station,
          })),
        })),
        items86: items86.filter((i) => i.is86 || (i.countRemaining !== null && i.countRemaining <= 5)),
        systemAlert: null,
      };
    }

    case 'manager': {
      const tickets = getMockTickets();
      const openOrders = tickets.filter((t) => t.status !== 'bumped' && t.status !== 'voided');
      const lateTickets = openOrders.filter((t) => {
        const elapsed = (Date.now() - new Date(t.fired_at || t.created_at).getTime()) / 1000;
        return elapsed > 600; // > 10 min
      });

      return {
        mode: 'manager',
        view,
        brand: isCheezies ? 'cheezies' : 'culinaryos',
        salesToday: isCheezies ? 284500 : 428300, // cents ($4,283.00)
        ordersToday: isCheezies ? 112 : 186,
        avgTicketCents: isCheezies ? 2540 : 2303, // $23.03
        kitchenAvgTimeSeconds: 434, // 07:14
        openOrdersCount: openOrders.length,
        lateOrdersCount: lateTickets.length || 2,
        currentVelocityPerHour: 34,
        stationLoad: {
          hot: 'BUSY',
          cold: 'NORMAL',
          fry: 'HEAVY',
          grill: 'BUSY',
          expo: 'NORMAL',
        },
        items86: ['Haddock', 'Blueberry Pie', ...(isCheezies ? ['Gluten-Free Brioche'] : [])],
        lowStockAlerts: [
          { item: 'Brioche Buns', remaining: '8 packs', status: 'LOW' },
          { item: 'Sharp Cheddar', remaining: '3 blocks', status: 'CRITICAL' },
          { item: 'Fries', remaining: '1.5 cases', status: 'LOW' },
        ],
        laborSnapshot: {
          clockedIn: 6,
          scheduled: 7,
          laborCostPercent: 24.5,
        },
        onlineHealth: 'ONLINE',
        posHealth: 'ONLINE',
      };
    }

    case 'staff': {
      return {
        mode: 'staff',
        view,
        brand: isCheezies ? 'cheezies' : 'culinaryos',
        shiftDate: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
        shiftNotes: [
          'Downtown lunch rush expected: 12:15 PM - 1:45 PM.',
          'Remember to call out 86 status to expo immediately.',
          'Health inspector visit scheduled for early next week.',
        ],
        prepPriorities: [
          { task: 'Pre-portion artisan bacon strips (50 bags)', station: 'Grill', done: false },
          { task: 'Whisk backup 8L House Cheese Sauce', station: 'Sauce', done: true },
          { task: 'Restock fry station russet wedges', station: 'Fry', done: false },
        ],
        specials: [
          { name: 'The Truffle Meltdown Special', price: '$16', notes: 'Comes with garlic parmesan fries' },
          { name: 'Tomato Basil Bisque Cup', price: '$5', notes: 'Pairs with any artisan melt' },
        ],
        items86: ['Blueberry Pie', 'Haddock Filets'],
        safetyReminders: [
          'Sanitizer buckets changed every 2 hours (tested 200ppm).',
          'Slip-resistant shoes mandatory on the line.',
        ],
      };
    }

    case 'guest': {
      // Digital Menu Board
      if (isCheezies) {
        return {
          mode: 'guest',
          view: 'cheezies_menu',
          brand: 'cheezies',
          brandInfo: CHEEZIES_COMPANY_INFO,
          categories: [
            {
              id: 'cat-signature-melts',
              name: 'ARTISAN MELTS',
              description: 'Handcrafted on thick artisanal grilled sourdough & brioche',
              items: [
                {
                  id: 'item-patty-meltdown',
                  name: 'The Patty Meltdown',
                  description: 'Smashed prime beef, caramelized onions, melted Swiss & cheddar, secret melt sauce',
                  priceCents: 1500,
                  isFeatured: true,
                  isSoldOut: false,
                  imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
                },
                {
                  id: 'item-mac-attack',
                  name: 'The Mac Attack',
                  description: 'Creamy 4-cheese mac & cheese grilled inside crispy brioche with smoked bacon',
                  priceCents: 1400,
                  isFeatured: false,
                  isSoldOut: false,
                },
                {
                  id: 'item-truffle-melt',
                  name: 'The Truffle Melt',
                  description: 'Wild forest mushrooms, white truffle aioli, fontina & gruyere on rustic sourdough',
                  priceCents: 1600,
                  isFeatured: true,
                  isSoldOut: false,
                },
                {
                  id: 'item-the-classic',
                  name: 'The Classic Grilled Cheese',
                  description: 'Aged Wisconsin cheddar and creamy Havarti grilled golden brown',
                  priceCents: 1100,
                  isFeatured: false,
                  isSoldOut: false,
                },
                {
                  id: 'item-buffalo-chicken',
                  name: 'Buffalo Chicken Melt',
                  description: 'Crispy fried chicken tossed in buffalo sauce, pepperjack, cool ranch drizzle',
                  priceCents: 1400,
                  isFeatured: false,
                  isSoldOut: true, // Example sold out
                },
              ],
            },
            {
              id: 'cat-sides-drinks',
              name: 'SIDES & DRINKS',
              items: [
                { id: 'side-combo', name: 'Chips & Drink Combo', description: 'Kettle chips + cold can', priceCents: 400 },
                { id: 'side-soup', name: 'Tomato Basil Soup Dip', description: 'Warm roasted tomato dip cup', priceCents: 500 },
                { id: 'side-drinks', name: 'Craft Soda / Bottled Water', priceCents: 300 },
              ],
            },
          ],
          specialNotice: 'Summit County Sales Tax 6.75% applied at register • Online ordering: cheeziesgourmetohio.com',
        };
      }

      return {
        mode: 'guest',
        view: 'menu',
        brand: 'culinaryos',
        categories: [
          {
            id: 'cat-burgers',
            name: 'BURGERS & MAINS',
            items: [
              { id: 'b1', name: 'Classic Burger', description: 'Lettuce, Tomato, Onion, Pickles', priceCents: 1200 },
              { id: 'b2', name: 'Bacon BBQ Burger', description: 'Smoked Bacon, Sharp Cheddar, House BBQ', priceCents: 1500, isFeatured: true },
              { id: 'b3', name: 'Mushroom Swiss', description: 'Sauteed Cremini, Melted Swiss, Garlic Aioli', priceCents: 1400 },
            ],
          },
          {
            id: 'cat-sides',
            name: 'SIDES & EXTRAS',
            items: [
              { id: 's1', name: 'Truffle Fries', description: 'Shaved Parmesan, Fresh Herbs, Truffle Aioli', priceCents: 700 },
              { id: 's2', name: 'Crispy Onion Rings', description: 'Beer battered with spicy remoulade', priceCents: 600 },
            ],
          },
        ],
        specialItem: {
          name: 'Smoked Pulled Pork Melt',
          description: 'House smoked pork, tangy slaw, melted pepper jack on brioche',
          priceCents: 1300,
        },
      };
    }

    case 'pickup': {
      return {
        mode: 'pickup',
        view,
        brand: isCheezies ? 'cheezies' : 'culinaryos',
        preparing: [
          { orderNumber: 1021, estimatedMinutes: 4 },
          { orderNumber: 1024, estimatedMinutes: 6 },
          { orderNumber: 1027, estimatedMinutes: 8 },
          { orderNumber: 1029, estimatedMinutes: 10 },
        ],
        ready: [
          { orderNumber: 1018, readyAt: 'Just now' },
          { orderNumber: 1020, readyAt: '1 min ago' },
          { orderNumber: 1023, readyAt: '3 mins ago' },
        ],
      };
    }

    case 'marketing': {
      const promoItems: DisplayPlaylistItem[] = [
        {
          id: 'slide-1',
          type: 'featured',
          title: isCheezies ? 'THE PATTY MELTDOWN' : 'CHEF SPECIAL: PRIME RIBEYE',
          subtitle: isCheezies ? 'VOTED #1 BEST FOOD TRUCK MELT' : 'AVAILABLE THIS WEEKEND ONLY',
          description: isCheezies
            ? 'Fresh smashed prime beef patty, sweet caramelized onions, double Swiss & sharp cheddar on thick garlic butter brioche.'
            : 'Center cut prime 12oz ribeye steak with herb garlic compound butter and charred asparagus.',
          priceCents: isCheezies ? 1500 : 3800,
          durationSeconds: 15,
          qrCodeUrl: 'https://cheeziesgourmetohio.com/order',
        },
        {
          id: 'slide-2',
          type: 'special',
          title: 'HAPPY HOUR COMBO',
          subtitle: '4:00 PM – 6:30 PM DAILY',
          description: 'Pair any artisanal melt or burger with loaded fries and a craft beverage for only $18.',
          priceCents: 1800,
          durationSeconds: 12,
        },
        {
          id: 'slide-3',
          type: 'loyalty',
          title: 'JOIN VIP REWARDS',
          subtitle: 'SCAN TO EARN POINTS ON EVERY ORDER',
          description: 'Get a free side of crispy fries on your next visit! Scan the QR code to sign up in 10 seconds.',
          durationSeconds: 10,
          qrCodeUrl: 'https://culinaryos.app/rewards',
        },
      ];

      return {
        mode: 'marketing',
        view,
        brand: isCheezies ? 'cheezies' : 'culinaryos',
        slides: promoItems,
        rotationIntervalSeconds: 15,
      };
    }

    default:
      return { mode, view, brand };
  }
}
