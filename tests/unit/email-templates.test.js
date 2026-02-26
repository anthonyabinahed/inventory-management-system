import { vi } from 'vitest';

// Mock config before importing templates
vi.mock('@/config', () => ({
  default: {
    appName: 'Test App',
    colors: { main: '#60baa9' },
  },
}));

const { buildAlertDigestHtml, buildAlertDigestText } = await import('@/libs/email-templates');

// ============ Test Data Factories ============

function makeReagent(overrides = {}) {
  return {
    name: 'Reagent A',
    reference: 'REF-001',
    total_quantity: 0,
    minimum_stock: 10,
    unit: 'vials',
    ...overrides,
  };
}

function makeLot(overrides = {}) {
  return {
    lot_number: 'LOT-001',
    expiry_date: '2026-02-20',
    quantity: 5,
    reagents: { name: 'Reagent B', reference: 'REF-002', unit: 'vials' },
    ...overrides,
  };
}

const BASE_PARAMS = {
  userName: 'Alice',
  outOfStockItems: [],
  lowStockItems: [],
  expiredLots: [],
  expiringSoonLots: [],
  siteUrl: 'https://example.com',
};

// ============ buildAlertDigestHtml ============

describe('buildAlertDigestHtml', () => {
  it('includes user greeting', () => {
    const html = buildAlertDigestHtml({
      ...BASE_PARAMS,
      outOfStockItems: [makeReagent()],
    });
    expect(html).toContain('Hello Alice');
  });

  it('renders greeting without name when userName is empty', () => {
    const html = buildAlertDigestHtml({
      ...BASE_PARAMS,
      userName: '',
      outOfStockItems: [makeReagent()],
    });
    expect(html).toContain('Hello,');
    expect(html).not.toContain('Hello ,');
  });

  it('renders out-of-stock section when items present', () => {
    const html = buildAlertDigestHtml({
      ...BASE_PARAMS,
      outOfStockItems: [makeReagent({ name: 'OutStock Item', reference: 'OS-1' })],
    });
    expect(html).toContain('OUT OF STOCK');
    expect(html).toContain('OutStock Item');
    expect(html).toContain('OS-1');
  });

  it('renders low-stock section with quantity info', () => {
    const html = buildAlertDigestHtml({
      ...BASE_PARAMS,
      lowStockItems: [makeReagent({ name: 'LowStock Item', total_quantity: 3, minimum_stock: 10, unit: 'tests' })],
    });
    expect(html).toContain('LOW STOCK');
    expect(html).toContain('3/10 tests');
  });

  it('renders expired lots section', () => {
    // 5 days ago
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);
    const html = buildAlertDigestHtml({
      ...BASE_PARAMS,
      expiredLots: [makeLot({ lot_number: 'EXP-LOT', expiry_date: pastDate.toISOString().split('T')[0] })],
    });
    expect(html).toContain('EXPIRED');
    expect(html).toContain('EXP-LOT');
    expect(html).toContain('5 days ago');
  });

  it('renders expiring-soon lots section', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    const html = buildAlertDigestHtml({
      ...BASE_PARAMS,
      expiringSoonLots: [makeLot({ lot_number: 'SOON-LOT', expiry_date: futureDate.toISOString().split('T')[0] })],
    });
    expect(html).toContain('EXPIRING SOON');
    expect(html).toContain('SOON-LOT');
    expect(html).toContain('10 days');
  });

  it('omits section when category is empty', () => {
    const html = buildAlertDigestHtml({
      ...BASE_PARAMS,
      outOfStockItems: [makeReagent()],
      lowStockItems: [],
      expiredLots: [],
      expiringSoonLots: [],
    });
    expect(html).toContain('OUT OF STOCK');
    expect(html).not.toContain('LOW STOCK');
    expect(html).not.toContain('EXPIRED');
    expect(html).not.toContain('EXPIRING SOON');
  });

  it('truncates to 5 items with overflow message', () => {
    const items = Array.from({ length: 8 }, (_, i) =>
      makeReagent({ name: `Item ${i}`, reference: `REF-${i}` })
    );
    const html = buildAlertDigestHtml({
      ...BASE_PARAMS,
      outOfStockItems: items,
    });
    // Should show first 5
    expect(html).toContain('Item 0');
    expect(html).toContain('Item 4');
    // Should NOT show item 5+
    expect(html).not.toContain('Item 5');
    // Should show overflow count
    expect(html).toContain('and 3 more');
  });

  it('does not show overflow when exactly 5 items', () => {
    const items = Array.from({ length: 5 }, (_, i) =>
      makeReagent({ name: `Item ${i}`, reference: `REF-${i}` })
    );
    const html = buildAlertDigestHtml({
      ...BASE_PARAMS,
      outOfStockItems: items,
    });
    expect(html).toContain('Item 4');
    expect(html).not.toContain('more');
  });

  it('includes View Inventory button with correct URL', () => {
    const html = buildAlertDigestHtml({
      ...BASE_PARAMS,
      outOfStockItems: [makeReagent()],
      siteUrl: 'https://my-inventory.com',
    });
    expect(html).toContain('View Inventory');
    expect(html).toContain('https://my-inventory.com');
  });

  it('includes total alert count in message', () => {
    const html = buildAlertDigestHtml({
      ...BASE_PARAMS,
      outOfStockItems: [makeReagent(), makeReagent()],
      lowStockItems: [makeReagent()],
    });
    expect(html).toContain('3 items need your attention');
  });

  it('uses singular form for 1 total alert', () => {
    const html = buildAlertDigestHtml({
      ...BASE_PARAMS,
      outOfStockItems: [makeReagent()],
    });
    expect(html).toContain('1 item needs your attention');
  });

  it('uses singular section title for 1 item', () => {
    const html = buildAlertDigestHtml({
      ...BASE_PARAMS,
      outOfStockItems: [makeReagent()],
    });
    expect(html).toContain('1 item OUT OF STOCK');
  });

  it('handles lot with missing reagent name gracefully', () => {
    const html = buildAlertDigestHtml({
      ...BASE_PARAMS,
      expiredLots: [makeLot({ reagents: null, expiry_date: '2026-01-01' })],
    });
    expect(html).toContain('Unknown');
  });
});

// ============ buildAlertDigestText ============

describe('buildAlertDigestText', () => {
  it('includes app name in header', () => {
    const text = buildAlertDigestText({
      ...BASE_PARAMS,
      outOfStockItems: [makeReagent()],
    });
    expect(text).toContain('Test App');
  });

  it('includes all alert categories when present', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 3);
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    const text = buildAlertDigestText({
      ...BASE_PARAMS,
      outOfStockItems: [makeReagent()],
      lowStockItems: [makeReagent({ total_quantity: 2 })],
      expiredLots: [makeLot({ expiry_date: pastDate.toISOString().split('T')[0] })],
      expiringSoonLots: [makeLot({ expiry_date: futureDate.toISOString().split('T')[0] })],
    });
    expect(text).toContain('OUT OF STOCK');
    expect(text).toContain('LOW STOCK');
    expect(text).toContain('EXPIRED');
    expect(text).toContain('EXPIRING SOON');
  });

  it('includes site URL', () => {
    const text = buildAlertDigestText({
      ...BASE_PARAMS,
      outOfStockItems: [makeReagent()],
      siteUrl: 'https://my-site.com',
    });
    expect(text).toContain('https://my-site.com');
  });

  it('includes unsubscribe notice', () => {
    const text = buildAlertDigestText({
      ...BASE_PARAMS,
      outOfStockItems: [makeReagent()],
    });
    expect(text).toContain('Contact your administrator');
  });

  it('truncates to 5 items with overflow in plain text', () => {
    const items = Array.from({ length: 7 }, (_, i) =>
      makeReagent({ name: `R${i}`, reference: `REF-${i}` })
    );
    const text = buildAlertDigestText({
      ...BASE_PARAMS,
      outOfStockItems: items,
    });
    expect(text).toContain('R4');
    expect(text).not.toContain('R5');
    expect(text).toContain('and 2 more');
  });
});
