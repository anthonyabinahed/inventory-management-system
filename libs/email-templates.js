import config from "@/config";
import { getExpiryStatus, getStockStatus } from "@/libs/constants";

const MAX_ITEMS_PER_SECTION = 5;

/**
 * Build a branded HTML email for the daily alert digest.
 * @param {object} params
 * @param {string} params.userName
 * @param {object[]} params.outOfStockItems - Reagents with quantity <= 0
 * @param {object[]} params.lowStockItems - Reagents with quantity > 0 but <= minimum_stock
 * @param {object[]} params.expiredLots - Lots already past expiry_date
 * @param {object[]} params.expiringSoonLots - Lots expiring within 30 days (not yet expired)
 * @param {string} params.siteUrl
 * @returns {string} HTML email body
 */
export function buildAlertDigestHtml({ userName, outOfStockItems, lowStockItems, expiredLots, expiringSoonLots, siteUrl }) {
  const totalAlerts = outOfStockItems.length + lowStockItems.length + expiredLots.length + expiringSoonLots.length;

  const sections = [];

  if (outOfStockItems.length > 0) {
    sections.push(buildSection({
      title: `${outOfStockItems.length} item${outOfStockItems.length === 1 ? '' : 's'} OUT OF STOCK`,
      color: '#dc2626',
      items: outOfStockItems.slice(0, MAX_ITEMS_PER_SECTION).map(r =>
        `${r.name} (${r.reference}) — 0 ${r.unit}`
      ),
      overflow: outOfStockItems.length > MAX_ITEMS_PER_SECTION
        ? outOfStockItems.length - MAX_ITEMS_PER_SECTION
        : 0,
    }));
  }

  if (lowStockItems.length > 0) {
    sections.push(buildSection({
      title: `${lowStockItems.length} item${lowStockItems.length === 1 ? '' : 's'} LOW STOCK`,
      color: '#d97706',
      items: lowStockItems.slice(0, MAX_ITEMS_PER_SECTION).map(r =>
        `${r.name} (${r.reference}) — ${r.total_quantity}/${r.minimum_stock} ${r.unit}`
      ),
      overflow: lowStockItems.length > MAX_ITEMS_PER_SECTION
        ? lowStockItems.length - MAX_ITEMS_PER_SECTION
        : 0,
    }));
  }

  if (expiredLots.length > 0) {
    sections.push(buildSection({
      title: `${expiredLots.length} lot${expiredLots.length === 1 ? '' : 's'} EXPIRED`,
      color: '#dc2626',
      items: expiredLots.slice(0, MAX_ITEMS_PER_SECTION).map(l => {
        const { daysUntil } = getExpiryStatus(l.expiry_date);
        const reagentName = l.reagents?.name || 'Unknown';
        return `${l.lot_number} (${reagentName}) — expired ${Math.abs(daysUntil)} day${Math.abs(daysUntil) === 1 ? '' : 's'} ago`;
      }),
      overflow: expiredLots.length > MAX_ITEMS_PER_SECTION
        ? expiredLots.length - MAX_ITEMS_PER_SECTION
        : 0,
    }));
  }

  if (expiringSoonLots.length > 0) {
    sections.push(buildSection({
      title: `${expiringSoonLots.length} lot${expiringSoonLots.length === 1 ? '' : 's'} EXPIRING SOON`,
      color: '#d97706',
      items: expiringSoonLots.slice(0, MAX_ITEMS_PER_SECTION).map(l => {
        const { daysUntil } = getExpiryStatus(l.expiry_date);
        const reagentName = l.reagents?.name || 'Unknown';
        return `${l.lot_number} (${reagentName}) — expires in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`;
      }),
      overflow: expiringSoonLots.length > MAX_ITEMS_PER_SECTION
        ? expiringSoonLots.length - MAX_ITEMS_PER_SECTION
        : 0,
    }));
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: ${config.colors.main}; margin-bottom: 5px;">${config.appName}</h1>
    <p style="color: #666; margin-top: 0;">Daily Inventory Alert</p>
  </div>

  <p>Hello${userName ? ` ${userName}` : ''},</p>

  <p>${totalAlerts} item${totalAlerts === 1 ? '' : 's'} need${totalAlerts === 1 ? 's' : ''} your attention today:</p>

  ${sections.join('\n')}

  <div style="text-align: center; margin: 30px 0;">
    <a href="${siteUrl}"
       style="display: inline-block; padding: 14px 32px; background-color: ${config.colors.main}; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
      View Inventory
    </a>
  </div>

  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

  <p style="color: #999; font-size: 12px; text-align: center;">
    You received this email because alerts are enabled for your account.<br>
    Contact your administrator to change this setting.
  </p>
</body>
</html>`;
}

/**
 * Build a plain text version of the alert digest email.
 */
export function buildAlertDigestText({ userName, outOfStockItems, lowStockItems, expiredLots, expiringSoonLots, siteUrl }) {
  const totalAlerts = outOfStockItems.length + lowStockItems.length + expiredLots.length + expiringSoonLots.length;

  const lines = [
    `${config.appName} — Daily Inventory Alert`,
    '',
    `Hello${userName ? ` ${userName}` : ''},`,
    '',
    `${totalAlerts} item${totalAlerts === 1 ? '' : 's'} need${totalAlerts === 1 ? 's' : ''} your attention today:`,
    '',
  ];

  if (outOfStockItems.length > 0) {
    lines.push(`--- OUT OF STOCK (${outOfStockItems.length}) ---`);
    outOfStockItems.slice(0, MAX_ITEMS_PER_SECTION).forEach(r => {
      lines.push(`  - ${r.name} (${r.reference}) — 0 ${r.unit}`);
    });
    if (outOfStockItems.length > MAX_ITEMS_PER_SECTION) {
      lines.push(`  ... and ${outOfStockItems.length - MAX_ITEMS_PER_SECTION} more`);
    }
    lines.push('');
  }

  if (lowStockItems.length > 0) {
    lines.push(`--- LOW STOCK (${lowStockItems.length}) ---`);
    lowStockItems.slice(0, MAX_ITEMS_PER_SECTION).forEach(r => {
      lines.push(`  - ${r.name} (${r.reference}) — ${r.total_quantity}/${r.minimum_stock} ${r.unit}`);
    });
    if (lowStockItems.length > MAX_ITEMS_PER_SECTION) {
      lines.push(`  ... and ${lowStockItems.length - MAX_ITEMS_PER_SECTION} more`);
    }
    lines.push('');
  }

  if (expiredLots.length > 0) {
    lines.push(`--- EXPIRED (${expiredLots.length}) ---`);
    expiredLots.slice(0, MAX_ITEMS_PER_SECTION).forEach(l => {
      const { daysUntil } = getExpiryStatus(l.expiry_date);
      const reagentName = l.reagents?.name || 'Unknown';
      lines.push(`  - ${l.lot_number} (${reagentName}) — expired ${Math.abs(daysUntil)} day${Math.abs(daysUntil) === 1 ? '' : 's'} ago`);
    });
    if (expiredLots.length > MAX_ITEMS_PER_SECTION) {
      lines.push(`  ... and ${expiredLots.length - MAX_ITEMS_PER_SECTION} more`);
    }
    lines.push('');
  }

  if (expiringSoonLots.length > 0) {
    lines.push(`--- EXPIRING SOON (${expiringSoonLots.length}) ---`);
    expiringSoonLots.slice(0, MAX_ITEMS_PER_SECTION).forEach(l => {
      const { daysUntil } = getExpiryStatus(l.expiry_date);
      const reagentName = l.reagents?.name || 'Unknown';
      lines.push(`  - ${l.lot_number} (${reagentName}) — expires in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`);
    });
    if (expiringSoonLots.length > MAX_ITEMS_PER_SECTION) {
      lines.push(`  ... and ${expiringSoonLots.length - MAX_ITEMS_PER_SECTION} more`);
    }
    lines.push('');
  }

  lines.push(`View Inventory: ${siteUrl}`);
  lines.push('');
  lines.push('You received this email because alerts are enabled for your account.');
  lines.push('Contact your administrator to change this setting.');

  return lines.join('\n');
}

// ============ INVITATION EMAIL ============

/**
 * Build a branded HTML email for user invitations.
 * @param {object} params
 * @param {string} params.fullName - Invitee's name (optional)
 * @param {string} params.inviteUrl - Signed invitation link
 * @returns {string} HTML email body
 */
export function buildInviteHtml({ fullName, inviteUrl }) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: ${config.colors.main}; margin-bottom: 10px;">${config.appName}</h1>
  </div>

  <h2 style="color: #333;">You're Invited!</h2>

  <p>Hello${fullName ? ` ${fullName}` : ''},</p>

  <p>You've been invited to join the <strong>${config.appName}</strong> platform.</p>

  <p>Click the button below to set your password and get started:</p>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${inviteUrl}"
       style="display: inline-block; padding: 14px 32px; background-color: ${config.colors.main}; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
      Accept Invitation
    </a>
  </div>

  <p style="color: #666; font-size: 14px;">
    This invitation link will expire in 24 hours.
  </p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

  <p style="color: #999; font-size: 12px; text-align: center;">
    If the button doesn't work, copy and paste this link into your browser:<br>
    <a href="${inviteUrl}" style="color: ${config.colors.main}; word-break: break-all;">${inviteUrl}</a>
  </p>
</body>
</html>`;
}

/**
 * Build a plain text version of the invitation email.
 */
export function buildInviteText({ fullName, inviteUrl }) {
  return [
    `You've been invited to ${config.appName}!`,
    '',
    `Hello${fullName ? ` ${fullName}` : ''},`,
    '',
    `Click this link to set your password and get started:`,
    inviteUrl,
    '',
    'This invitation link will expire in 24 hours.',
  ].join('\n');
}

// ============ PASSWORD RESET EMAIL ============

/**
 * Build a branded HTML email for password reset requests.
 * @param {object} params
 * @param {string} params.resetUrl - Signed password reset link
 * @returns {string} HTML email body
 */
export function buildPasswordResetHtml({ resetUrl }) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: ${config.colors.main}; margin-bottom: 10px;">${config.appName}</h1>
  </div>

  <h2 style="color: #333;">Reset Your Password</h2>

  <p>Hello,</p>

  <p>We received a request to reset your password for your <strong>${config.appName}</strong> account.</p>

  <p>Click the button below to set a new password:</p>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${resetUrl}"
       style="display: inline-block; padding: 14px 32px; background-color: ${config.colors.main}; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
      Reset Password
    </a>
  </div>

  <p style="color: #666; font-size: 14px;">
    This link will expire in 24 hours. If you didn't request a password reset, you can safely ignore this email.
  </p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

  <p style="color: #999; font-size: 12px; text-align: center;">
    If the button doesn't work, copy and paste this link into your browser:<br>
    <a href="${resetUrl}" style="color: ${config.colors.main}; word-break: break-all;">${resetUrl}</a>
  </p>
</body>
</html>`;
}

/**
 * Build a plain text version of the password reset email.
 */
export function buildPasswordResetText({ resetUrl }) {
  return [
    `Reset Your Password`,
    '',
    'Hello,',
    '',
    `We received a request to reset your password for your ${config.appName} account.`,
    '',
    'Click this link to set a new password:',
    resetUrl,
    '',
    "This link will expire in 24 hours. If you didn't request a password reset, you can safely ignore this email.",
  ].join('\n');
}

// ============ INTERNAL HELPERS ============

/**
 * Build an HTML section block for the digest email.
 */
function buildSection({ title, color, items, overflow }) {
  const itemsHtml = items
    .map(text => `<li style="margin-bottom: 4px;">${text}</li>`)
    .join('\n');

  const overflowHtml = overflow > 0
    ? `<li style="margin-bottom: 4px; color: #666; font-style: italic;">... and ${overflow} more</li>`
    : '';

  return `
  <div style="margin-bottom: 20px;">
    <div style="display: inline-block; padding: 4px 12px; background-color: ${color}; color: white; border-radius: 4px; font-size: 13px; font-weight: 600; margin-bottom: 8px;">
      ${title}
    </div>
    <ul style="margin: 8px 0; padding-left: 20px; font-size: 14px;">
      ${itemsHtml}
      ${overflowHtml}
    </ul>
  </div>`;
}
