const nodemailer = require('nodemailer');
require('dotenv').config();

// Create Gmail transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });
};

// Base email sender
const sendEmail = async ({ to, subject, html }) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"PetroVault Alerts" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error('❌ Email failed:', error.message);
    return { success: false, error: error.message };
  }
};

// Low stock alert email
const sendLowStockAlert = async ({ to, tankName, fillPercentage, currentVolume, capacity, productName }) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1e293b; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">⚠️ PetroVault Alert</h1>
      </div>
      <div style="background: #fff7ed; border: 2px solid #f97316; padding: 24px; border-radius: 0 0 8px 8px;">
        <h2 style="color: #ea580c; margin-top: 0;">Low Stock Warning</h2>
        <p style="color: #0f172a; font-size: 16px;">Tank <strong>${tankName}</strong> is running low on <strong>${productName}</strong>.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr style="background: #ffedd5;">
            <td style="padding: 10px; border: 1px solid #fed7aa; color: #0f172a;"><strong>Tank</strong></td>
            <td style="padding: 10px; border: 1px solid #fed7aa; color: #0f172a;">${tankName}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #fed7aa; color: #0f172a;"><strong>Product</strong></td>
            <td style="padding: 10px; border: 1px solid #fed7aa; color: #0f172a;">${productName}</td>
          </tr>
          <tr style="background: #ffedd5;">
            <td style="padding: 10px; border: 1px solid #fed7aa; color: #0f172a;"><strong>Fill Level</strong></td>
            <td style="padding: 10px; border: 1px solid #fed7aa; color: #ef4444;"><strong>${fillPercentage}%</strong></td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #fed7aa; color: #0f172a;"><strong>Current Volume</strong></td>
            <td style="padding: 10px; border: 1px solid #fed7aa; color: #0f172a;">${currentVolume.toLocaleString()} L</td>
          </tr>
          <tr style="background: #ffedd5;">
            <td style="padding: 10px; border: 1px solid #fed7aa; color: #0f172a;"><strong>Capacity</strong></td>
            <td style="padding: 10px; border: 1px solid #fed7aa; color: #0f172a;">${capacity.toLocaleString()} L</td>
          </tr>
        </table>
        <p style="color: #64748b; font-size: 14px;">Please arrange a refill as soon as possible.</p>
        <p style="color: #64748b; font-size: 12px; margin-bottom: 0;">— PetroVault Automated Alert System</p>
      </div>
    </div>
  `;

  return sendEmail({
    to,
    subject: `⚠️ Low Stock Alert — Tank ${tankName} at ${fillPercentage}%`,
    html
  });
};

// Tank full alert email
const sendTankFullAlert = async ({ to, tankName, fillPercentage, currentVolume, capacity, productName }) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1e293b; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🔴 PetroVault Alert</h1>
      </div>
      <div style="background: #fef2f2; border: 2px solid #ef4444; padding: 24px; border-radius: 0 0 8px 8px;">
        <h2 style="color: #dc2626; margin-top: 0;">Tank Full Warning</h2>
        <p style="color: #0f172a; font-size: 16px;">Tank <strong>${tankName}</strong> is at or near full capacity!</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr style="background: #fee2e2;">
            <td style="padding: 10px; border: 1px solid #fecaca; color: #0f172a;"><strong>Tank</strong></td>
            <td style="padding: 10px; border: 1px solid #fecaca; color: #0f172a;">${tankName}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #fecaca; color: #0f172a;"><strong>Product</strong></td>
            <td style="padding: 10px; border: 1px solid #fecaca; color: #0f172a;">${productName}</td>
          </tr>
          <tr style="background: #fee2e2;">
            <td style="padding: 10px; border: 1px solid #fecaca; color: #0f172a;"><strong>Fill Level</strong></td>
            <td style="padding: 10px; border: 1px solid #fecaca; color: #ef4444;"><strong>${fillPercentage}%</strong></td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #fecaca; color: #0f172a;"><strong>Current Volume</strong></td>
            <td style="padding: 10px; border: 1px solid #fecaca; color: #0f172a;">${currentVolume.toLocaleString()} L</td>
          </tr>
          <tr style="background: #fee2e2;">
            <td style="padding: 10px; border: 1px solid #fecaca; color: #0f172a;"><strong>Capacity</strong></td>
            <td style="padding: 10px; border: 1px solid #fecaca; color: #0f172a;">${capacity.toLocaleString()} L</td>
          </tr>
        </table>
        <p style="color: #64748b; font-size: 14px;">Stop all incoming stock to this tank immediately.</p>
        <p style="color: #64748b; font-size: 12px; margin-bottom: 0;">— PetroVault Automated Alert System</p>
      </div>
    </div>
  `;

  return sendEmail({
    to,
    subject: `🔴 Tank Full Alert — Tank ${tankName} at ${fillPercentage}%`,
    html
  });
};

// Overfill attempt alert email
const sendOverfillAlert = async ({ to, tankName, attemptedVolume, maxCanAdd, currentVolume, capacity, productName, attemptedBy }) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1e293b; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🚨 PetroVault Alert</h1>
      </div>
      <div style="background: #fdf4ff; border: 2px solid #7c3aed; padding: 24px; border-radius: 0 0 8px 8px;">
        <h2 style="color: #7c3aed; margin-top: 0;">Overfill Attempt Blocked</h2>
        <p style="color: #0f172a; font-size: 16px;">An overfill attempt was blocked for tank <strong>${tankName}</strong>.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr style="background: #f3e8ff;">
            <td style="padding: 10px; border: 1px solid #e9d5ff; color: #0f172a;"><strong>Tank</strong></td>
            <td style="padding: 10px; border: 1px solid #e9d5ff; color: #0f172a;">${tankName}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e9d5ff; color: #0f172a;"><strong>Attempted By</strong></td>
            <td style="padding: 10px; border: 1px solid #e9d5ff; color: #7c3aed;"><strong>${attemptedBy}</strong></td>
          </tr>
          <tr style="background: #f3e8ff;">
            <td style="padding: 10px; border: 1px solid #e9d5ff; color: #0f172a;"><strong>Attempted Volume</strong></td>
            <td style="padding: 10px; border: 1px solid #e9d5ff; color: #ef4444;"><strong>${attemptedVolume.toLocaleString()} L</strong></td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e9d5ff; color: #0f172a;"><strong>Max Can Add</strong></td>
            <td style="padding: 10px; border: 1px solid #e9d5ff; color: #22c55e;">${maxCanAdd.toLocaleString()} L</td>
          </tr>
          <tr style="background: #f3e8ff;">
            <td style="padding: 10px; border: 1px solid #e9d5ff; color: #0f172a;"><strong>Current Volume</strong></td>
            <td style="padding: 10px; border: 1px solid #e9d5ff; color: #0f172a;">${currentVolume.toLocaleString()} L</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e9d5ff; color: #0f172a;"><strong>Capacity</strong></td>
            <td style="padding: 10px; border: 1px solid #e9d5ff; color: #0f172a;">${capacity.toLocaleString()} L</td>
          </tr>
        </table>
        <p style="color: #64748b; font-size: 14px;">The operation was blocked automatically by PetroVault.</p>
        <p style="color: #64748b; font-size: 12px; margin-bottom: 0;">— PetroVault Automated Alert System</p>
      </div>
    </div>
  `;

  return sendEmail({
    to,
    subject: `🚨 Overfill Attempt Blocked — Tank ${tankName} by ${attemptedBy}`,
    html
  });
};

// Product-level low stock alert — shows ALL tanks for that product
const sendProductLowStockAlert = async ({
  to,
  productName,
  triggeredTankName,
  triggeredFill,
  allTanks,
  totalVolume,
  totalCapacity,
}) => {
  const overallFill = totalCapacity > 0
    ? Math.round((totalVolume / totalCapacity) * 100 * 10) / 10
    : 0;

  const tankRows = allTanks.map((t, i) => {
    const bg = i % 2 === 0 ? '#fff7ed' : '#ffffff';
    const fillColor = t.fill_percentage < 20 ? '#ef4444' : t.fill_percentage >= 90 ? '#eab308' : '#22c55e';
    const highlight = t.name === triggeredTankName ? 'font-weight:bold;' : '';
    return `
      <tr style="background:${bg};">
        <td style="padding:10px;border:1px solid #fed7aa;color:#0f172a;${highlight}">${t.name}</td>
        <td style="padding:10px;border:1px solid #fed7aa;color:${fillColor};font-weight:bold;">${t.fill_percentage}%</td>
        <td style="padding:10px;border:1px solid #fed7aa;color:#0f172a;">${(t.current_volume || 0).toLocaleString()} L</td>
        <td style="padding:10px;border:1px solid #fed7aa;color:#0f172a;">${(t.capacity_litres || 0).toLocaleString()} L</td>
        <td style="padding:10px;border:1px solid #fed7aa;color:#64748b;text-transform:capitalize;">${t.status}</td>
      </tr>`;
  }).join('');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto;">
      <div style="background: #1e293b; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">⚠️ PetroVault Alert</h1>
      </div>
      <div style="background: #fff7ed; border: 2px solid #f97316; padding: 24px; border-radius: 0 0 8px 8px;">
        <h2 style="color: #ea580c; margin-top: 0;">Low Stock Warning — ${productName}</h2>
        <p style="color: #0f172a; font-size: 16px;">
          Tank <strong>${triggeredTankName}</strong> dropped to <strong style="color:#ef4444;">${triggeredFill}%</strong>.
          Here is the full status of <strong>${productName}</strong> across all tanks:
        </p>

        <div style="background:#fff; border:1px solid #fed7aa; border-radius:8px; padding:16px; margin:16px 0; display:flex; gap:24px;">
          <div style="text-align:center; flex:1;">
            <p style="margin:0; color:#64748b; font-size:12px; text-transform:uppercase;">Total Volume</p>
            <p style="margin:4px 0; color:#ea580c; font-size:22px; font-weight:bold;">${totalVolume.toLocaleString()} L</p>
          </div>
          <div style="text-align:center; flex:1;">
            <p style="margin:0; color:#64748b; font-size:12px; text-transform:uppercase;">Total Capacity</p>
            <p style="margin:4px 0; color:#0f172a; font-size:22px; font-weight:bold;">${totalCapacity.toLocaleString()} L</p>
          </div>
          <div style="text-align:center; flex:1;">
            <p style="margin:0; color:#64748b; font-size:12px; text-transform:uppercase;">Overall Fill</p>
            <p style="margin:4px 0; color:#ea580c; font-size:22px; font-weight:bold;">${overallFill}%</p>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <thead>
            <tr style="background: #fed7aa;">
              <th style="padding:10px; border:1px solid #f97316; color:#0f172a; text-align:left;">Tank</th>
              <th style="padding:10px; border:1px solid #f97316; color:#0f172a; text-align:left;">Fill %</th>
              <th style="padding:10px; border:1px solid #f97316; color:#0f172a; text-align:left;">Volume</th>
              <th style="padding:10px; border:1px solid #f97316; color:#0f172a; text-align:left;">Capacity</th>
              <th style="padding:10px; border:1px solid #f97316; color:#0f172a; text-align:left;">Status</th>
            </tr>
          </thead>
          <tbody>${tankRows}</tbody>
        </table>

        <p style="color: #64748b; font-size: 14px;">Please arrange a refill for the low tanks as soon as possible.</p>
        <p style="color: #64748b; font-size: 12px; margin-bottom: 0;">— PetroVault Automated Alert System</p>
      </div>
    </div>
  `;

  return sendEmail({
    to,
    subject: `⚠️ Low Stock — ${productName} (${allTanks.length} tanks, ${overallFill}% overall)`,
    html,
  });
};

// Product-level volume threshold alert (low or high)
const sendProductAlertByVolume = async ({ to, productName, alertType, totalVolume, totalCapacity, threshold, allTanks }) => {
  const isLow = alertType === 'low';
  const themeColor  = isLow ? '#ef4444' : '#f97316';
  const themeBg     = isLow ? '#fef2f2' : '#fff7ed';
  const themeBorder = isLow ? '#ef4444' : '#f97316';
  const emoji       = isLow ? '⚠️' : '🔴';
  const alertLabel  = isLow ? 'Low Stock Warning' : 'High Stock Warning';
  const subjectPfx  = isLow ? '⚠️ Low' : '🔴 High';
  const overallFill = totalCapacity > 0 ? Math.round((totalVolume / totalCapacity) * 100) : 0;

  const tankRows = allTanks.map((t, i) => `
    <tr style="background:${i % 2 === 0 ? '#f9fafb' : '#ffffff'}">
      <td style="padding:8px 10px;border:1px solid #e2e8f0;color:#0f172a">${t.name}</td>
      <td style="padding:8px 10px;border:1px solid #e2e8f0;color:#0f172a;text-align:right">${Math.round(t.current_volume).toLocaleString()} L</td>
      <td style="padding:8px 10px;border:1px solid #e2e8f0;color:#0f172a;text-align:right">${t.capacity_litres.toLocaleString()} L</td>
      <td style="padding:8px 10px;border:1px solid #e2e8f0;color:#0f172a;text-align:right">${t.fill_percentage}%</td>
    </tr>`).join('');

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto">
      <div style="background:#1e293b;padding:20px;border-radius:8px 8px 0 0">
        <h1 style="color:#fff;margin:0;font-size:22px">${emoji} PetroVault — Product Alert</h1>
      </div>
      <div style="background:${themeBg};border:2px solid ${themeBorder};padding:24px;border-radius:0 0 8px 8px">
        <h2 style="color:${themeColor};margin-top:0">${alertLabel} — ${productName}</h2>
        <p style="color:#0f172a;font-size:15px">
          The total volume of <strong>${productName}</strong> across all tanks has crossed the configured threshold.
        </p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr style="background:${isLow ? '#fee2e2' : '#ffedd5'}">
            <td style="padding:10px;border:1px solid #e2e8f0;color:#0f172a"><strong>Total Volume</strong></td>
            <td style="padding:10px;border:1px solid #e2e8f0;color:${themeColor};font-weight:bold">${Math.round(totalVolume).toLocaleString()} L</td>
          </tr>
          <tr>
            <td style="padding:10px;border:1px solid #e2e8f0;color:#0f172a"><strong>Total Capacity</strong></td>
            <td style="padding:10px;border:1px solid #e2e8f0;color:#0f172a">${totalCapacity.toLocaleString()} L</td>
          </tr>
          <tr style="background:${isLow ? '#fee2e2' : '#ffedd5'}">
            <td style="padding:10px;border:1px solid #e2e8f0;color:#0f172a"><strong>Overall Fill</strong></td>
            <td style="padding:10px;border:1px solid #e2e8f0;color:${themeColor};font-weight:bold">${overallFill}%</td>
          </tr>
          <tr>
            <td style="padding:10px;border:1px solid #e2e8f0;color:#0f172a"><strong>${isLow ? 'Low' : 'High'} Threshold</strong></td>
            <td style="padding:10px;border:1px solid #e2e8f0;color:#0f172a">${threshold.toLocaleString()} L</td>
          </tr>
        </table>
        <h3 style="color:#0f172a;margin-bottom:8px">Tank Breakdown</h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
          <thead>
            <tr style="background:#0f172a;color:#fff">
              <th style="padding:8px 10px;text-align:left">Tank</th>
              <th style="padding:8px 10px;text-align:right">Volume</th>
              <th style="padding:8px 10px;text-align:right">Capacity</th>
              <th style="padding:8px 10px;text-align:right">Fill %</th>
            </tr>
          </thead>
          <tbody>${tankRows}</tbody>
        </table>
        <p style="color:#64748b;font-size:14px">${isLow ? 'Please arrange restocking as soon as possible.' : 'Please review and manage stock levels.'}</p>
        <p style="color:#64748b;font-size:12px;margin-bottom:0">— PetroVault Automated Alert System</p>
      </div>
    </div>
  `;

  return sendEmail({
    to,
    subject: `${subjectPfx} Stock Alert — ${productName} at ${Math.round(totalVolume).toLocaleString()} L (${overallFill}%)`,
    html,
  });
};

module.exports = {
  sendEmail,
  sendLowStockAlert,
  sendTankFullAlert,
  sendOverfillAlert,
  sendProductLowStockAlert,
  sendProductAlertByVolume,
  sendPasswordResetOTP,
};

// Password reset OTP email
async function sendPasswordResetOTP({ to, otp, username }) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #1e293b 0%, #0f4c8a 100%); padding: 32px 24px; border-radius: 12px 12px 0 0; text-align: center;">
        <div style="display: inline-flex; align-items: center; gap: 10px;">
          <div style="background: rgba(255,255,255,0.15); border-radius: 10px; width: 44px; height: 44px; display: inline-flex; align-items: center; justify-content: center;">
            <span style="font-size: 22px;">🔐</span>
          </div>
          <span style="color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">PetroVault</span>
        </div>
        <p style="color: #94a3b8; margin: 8px 0 0; font-size: 14px;">Oil Tank Management System</p>
      </div>

      <!-- Body -->
      <div style="background: #ffffff; padding: 36px 32px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
        <h2 style="color: #0f172a; margin: 0 0 8px; font-size: 22px;">Password Reset Request</h2>
        <p style="color: #64748b; font-size: 15px; margin: 0 0 28px; line-height: 1.6;">
          Hi <strong style="color: #0f172a;">${username}</strong>, we received a request to reset your PetroVault password.
          Use the OTP below to proceed. It expires in <strong>15 minutes</strong>.
        </p>

        <!-- OTP Box -->
        <div style="background: #f1f5f9; border: 2px dashed #0f4c8a; border-radius: 12px; padding: 24px; text-align: center; margin: 0 0 28px;">
          <p style="color: #64748b; font-size: 13px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1px;">Your One-Time Password</p>
          <div style="font-size: 42px; font-weight: 800; letter-spacing: 12px; color: #0f4c8a; font-family: 'Courier New', monospace;">
            ${otp}
          </div>
        </div>

        <div style="background: #fff7ed; border-left: 4px solid #f97316; border-radius: 6px; padding: 14px 16px; margin-bottom: 24px;">
          <p style="color: #92400e; font-size: 13px; margin: 0; line-height: 1.6;">
            ⚠️ <strong>Security Notice:</strong> If you did not request a password reset, please ignore this email. 
            Your password will remain unchanged and this OTP will expire automatically.
          </p>
        </div>

        <p style="color: #94a3b8; font-size: 13px; margin: 0; line-height: 1.6;">
          This OTP is valid for a single use only and will expire in 15 minutes.
        </p>
      </div>

      <!-- Footer -->
      <div style="background: #f1f5f9; padding: 20px 32px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none; text-align: center;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">
          PetroVault &copy; ${new Date().getFullYear()} — This is an automated message, please do not reply.
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to,
    subject: '🔐 PetroVault — Your Password Reset OTP',
    html,
  });
}
