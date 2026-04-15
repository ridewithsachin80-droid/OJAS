const nodemailer = require('nodemailer');

// ─────────────────────────────────────────
// EMAIL (Nodemailer — Gmail or SMTP)
// ─────────────────────────────────────────
function getMailer() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    tls: { rejectUnauthorized: false }
  });
}

async function sendEmail({ to, subject, html, text }) {
  const mailer = getMailer();
  if (!mailer) { console.log('[Email] Not configured — skipping:', subject); return false; }
  if (!to) { console.log('[Email] No recipient — skipping'); return false; }
  try {
    await mailer.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'InvestTrack'}" <${process.env.EMAIL_USER}>`,
      to, subject, html, text
    });
    console.log(`[Email] Sent to ${to}: ${subject}`);
    return true;
  } catch (e) {
    console.error('[Email] Failed:', e.message);
    return false;
  }
}

// ─────────────────────────────────────────
// WHATSAPP (Twilio)
// ─────────────────────────────────────────
function getTwilio() {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) return null;
  const twilio = require('twilio');
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

async function sendWhatsApp(to, message) {
  const client = getTwilio();
  if (!client) { console.log('[WhatsApp] Not configured — skipping'); return false; }
  if (!to) return false;
  // Normalize number: add country code if missing
  let num = to.replace(/\D/g, '');
  if (num.length === 10) num = '91' + num; // India default
  const from = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886'; // Twilio sandbox default
  try {
    await client.messages.create({
      from,
      to: `whatsapp:+${num}`,
      body: message
    });
    console.log(`[WhatsApp] Sent to +${num}`);
    return true;
  } catch (e) {
    console.error('[WhatsApp] Failed:', e.message);
    return false;
  }
}

// ─────────────────────────────────────────
// NOTIFICATION TEMPLATES
// ─────────────────────────────────────────
const appUrl = () => process.env.APP_URL || 'https://your-app.railway.app';

const templates = {

  // 1. Welcome investor with login credentials
  welcomeInvestor: ({ name, email, password, projectName }) => ({
    subject: `Welcome to ${projectName} — Your InvestTrack Login`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f1f5fb;padding:20px">
        <div style="background:#1B3A6B;padding:24px;border-radius:12px 12px 0 0;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:22px">🏗 InvestTrack</h1>
          <p style="color:rgba(255,255,255,.7);margin:4px 0 0;font-size:13px">AOP Real Estate Investment Platform</p>
        </div>
        <div style="background:#fff;padding:28px;border-radius:0 0 12px 12px">
          <h2 style="color:#1B3A6B;margin:0 0 16px">Welcome, ${name}! 👋</h2>
          <p style="color:#374151">You have been registered as an investor in <strong>${projectName}</strong>. Your investment portal is ready.</p>
          <div style="background:#F0F4FA;border-radius:8px;padding:16px;margin:20px 0;border-left:4px solid #C49A22">
            <p style="margin:0 0 8px;font-size:13px;color:#6B7280">YOUR LOGIN CREDENTIALS</p>
            <p style="margin:4px 0;font-size:15px"><strong>URL:</strong> <a href="${appUrl()}" style="color:#2E5FA3">${appUrl()}</a></p>
            <p style="margin:4px 0;font-size:15px"><strong>Email:</strong> ${email}</p>
            <p style="margin:4px 0;font-size:15px"><strong>Password:</strong> <code style="background:#e5e7eb;padding:2px 6px;border-radius:4px">${password}</code></p>
          </div>
          <p style="color:#6B7280;font-size:12px">Please change your password after first login. Do not share these credentials.</p>
          <a href="${appUrl()}" style="display:inline-block;background:#1B3A6B;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:8px">Login to Your Portal →</a>
        </div>
        <p style="text-align:center;font-size:11px;color:#9CA3AF;margin-top:12px">This is an automated message from InvestTrack. Contact your project administrator for queries.</p>
      </div>`,
    text: `Welcome ${name}! Login at ${appUrl()} | Email: ${email} | Password: ${password}`
  }),

  // 2. Investment confirmation
  investmentConfirmed: ({ name, investorCode, amount, projectName, date, share }) => ({
    subject: `Investment Confirmed — ${projectName} — ${investorCode}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f1f5fb;padding:20px">
        <div style="background:#1B3A6B;padding:24px;border-radius:12px 12px 0 0;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:22px">🏗 InvestTrack</h1>
        </div>
        <div style="background:#fff;padding:28px;border-radius:0 0 12px 12px">
          <div style="text-align:center;margin-bottom:20px">
            <span style="font-size:48px">✅</span>
            <h2 style="color:#166534;margin:8px 0">Investment Confirmed!</h2>
          </div>
          <p>Dear <strong>${name}</strong>,</p>
          <p>Your investment in <strong>${projectName}</strong> has been recorded successfully.</p>
          <div style="background:#F0F4FA;border-radius:8px;padding:16px;margin:20px 0">
            <table style="width:100%;font-size:14px">
              <tr><td style="padding:6px 0;color:#6B7280">Investor Code</td><td style="font-weight:bold;color:#1B3A6B">${investorCode}</td></tr>
              <tr><td style="padding:6px 0;color:#6B7280">Amount Invested</td><td style="font-weight:bold;font-size:18px;color:#166534">₹${Number(amount).toLocaleString('en-IN')}</td></tr>
              <tr><td style="padding:6px 0;color:#6B7280">Date</td><td>${date}</td></tr>
              <tr><td style="padding:6px 0;color:#6B7280">Pool Share</td><td style="color:#C49A22;font-weight:bold">${share}%</td></tr>
            </table>
          </div>
          <p style="color:#6B7280;font-size:12px">View your certificate and full details on your investor portal.</p>
          <a href="${appUrl()}" style="display:inline-block;background:#1B3A6B;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">View My Portal →</a>
        </div>
      </div>`,
    text: `Investment Confirmed! ${investorCode} | Amount: ₹${Number(amount).toLocaleString('en-IN')} | Project: ${projectName} | Login: ${appUrl()}`
  }),

  // 3. Milestone update
  milestoneUpdate: ({ projectName, milestoneName, status, notes }) => ({
    subject: `Project Update: ${milestoneName} — ${projectName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f1f5fb;padding:20px">
        <div style="background:#1B3A6B;padding:24px;border-radius:12px 12px 0 0;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:22px">🏗 InvestTrack — Project Update</h1>
        </div>
        <div style="background:#fff;padding:28px;border-radius:0 0 12px 12px">
          <p>Your project <strong>${projectName}</strong> has a milestone update:</p>
          <div style="background:${status==='done'?'#DCFCE7':status==='active'?'#FEF3C7':'#F1F5F9'};border-radius:8px;padding:16px;margin:20px 0;border-left:4px solid ${status==='done'?'#166534':status==='active'?'#C49A22':'#9CA3AF'}">
            <p style="margin:0 0 6px;font-size:16px;font-weight:bold;color:#1B3A6B">${milestoneName}</p>
            <p style="margin:0;font-size:14px">Status: <strong>${status === 'done' ? '✅ Completed' : status === 'active' ? '🔄 In Progress' : '⏳ Pending'}</strong></p>
            ${notes ? `<p style="margin:8px 0 0;font-size:13px;color:#6B7280">${notes}</p>` : ''}
          </div>
          <a href="${appUrl()}" style="display:inline-block;background:#1B3A6B;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">View Full Status →</a>
        </div>
      </div>`,
    text: `Project Update: ${milestoneName} is now ${status} in ${projectName}. Login: ${appUrl()}`
  }),

  // 4. Stage update / new photos
  stageUpdate: ({ projectName, title, description }) => ({
    subject: `New Site Update: ${title} — ${projectName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f1f5fb;padding:20px">
        <div style="background:#1B3A6B;padding:24px;border-radius:12px 12px 0 0;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:22px">📸 Site Update — ${projectName}</h1>
        </div>
        <div style="background:#fff;padding:28px;border-radius:0 0 12px 12px">
          <h3 style="color:#1B3A6B">${title}</h3>
          ${description ? `<p style="color:#374151">${description}</p>` : ''}
          <p style="color:#6B7280;font-size:13px">New photos and updates have been posted. Login to view them.</p>
          <a href="${appUrl()}" style="display:inline-block;background:#1B3A6B;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">View Photos →</a>
        </div>
      </div>`,
    text: `New site update posted for ${projectName}: ${title}. View photos at ${appUrl()}`
  }),

  // 5. New document shared
  documentShared: ({ projectName, docTitle, docType }) => ({
    subject: `New Document Available — ${projectName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f1f5fb;padding:20px">
        <div style="background:#1B3A6B;padding:24px;border-radius:12px 12px 0 0;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:22px">📄 New Document — ${projectName}</h1>
        </div>
        <div style="background:#fff;padding:28px;border-radius:0 0 12px 12px">
          <p>A new document has been shared with you:</p>
          <div style="background:#F0F4FA;border-radius:8px;padding:16px;margin:20px 0;border-left:4px solid #2E5FA3">
            <p style="margin:0;font-size:15px;font-weight:bold">${docTitle}</p>
            <p style="margin:4px 0 0;font-size:12px;color:#6B7280">${docType.replace(/_/g,' ')}</p>
          </div>
          <a href="${appUrl()}" style="display:inline-block;background:#1B3A6B;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">View Document →</a>
        </div>
      </div>`,
    text: `New document shared: ${docTitle} for ${projectName}. View at ${appUrl()}`
  })
};

// ─────────────────────────────────────────
// WHATSAPP MESSAGE TEMPLATES
// ─────────────────────────────────────────
const waTemplates = {
  welcomeInvestor: ({ name, email, password, projectName }) =>
    `🏗 *InvestTrack — Welcome!*\n\nDear ${name},\n\nYou are registered as an investor in *${projectName}*.\n\n*Login Details:*\n🌐 ${appUrl()}\n📧 Email: ${email}\n🔑 Password: ${password}\n\nPlease change your password after first login.\n\n_Contact your project administrator for any queries._`,

  investmentConfirmed: ({ name, investorCode, amount, projectName, share }) =>
    `✅ *Investment Confirmed!*\n\nDear ${name},\n\nYour investment in *${projectName}* is confirmed.\n\n📋 Code: ${investorCode}\n💰 Amount: ₹${Number(amount).toLocaleString('en-IN')}\n📊 Pool Share: ${share}%\n\nLogin to view your certificate: ${appUrl()}`,

  milestoneUpdate: ({ projectName, milestoneName, status }) =>
    `🏗 *Project Update — ${projectName}*\n\n*${milestoneName}* is now ${status === 'done' ? '✅ Completed' : status === 'active' ? '🔄 In Progress' : '⏳ Pending'}\n\nLogin to view full details: ${appUrl()}`,

  stageUpdate: ({ projectName, title }) =>
    `📸 *New Site Update — ${projectName}*\n\n*${title}*\n\nNew photos have been posted. View them on your investor portal:\n${appUrl()}`,

  documentShared: ({ projectName, docTitle }) =>
    `📄 *New Document — ${projectName}*\n\n*${docTitle}* has been shared with you.\n\nLogin to view & download:\n${appUrl()}`
};

// ─────────────────────────────────────────
// MAIN NOTIFICATION FUNCTION
// ─────────────────────────────────────────
async function notify(templateKey, data, recipients) {
  // recipients: array of { email, mobile, name }
  if (!recipients || recipients.length === 0) return;

  const emailTpl = templates[templateKey];
  const waTpl = waTemplates[templateKey];

  const results = await Promise.allSettled(
    recipients.flatMap(r => {
      const tasks = [];
      if (emailTpl && r.email) {
        const t = emailTpl({ ...data, name: r.name || data.name });
        tasks.push(sendEmail({ to: r.email, ...t }));
      }
      if (waTpl && r.mobile) {
        const msg = waTpl({ ...data, name: r.name || data.name });
        tasks.push(sendWhatsApp(r.mobile, msg));
      }
      return tasks;
    })
  );

  const sent = results.filter(r => r.status === 'fulfilled' && r.value).length;
  console.log(`[Notify] ${templateKey} — ${sent}/${results.length} sent`);
}

module.exports = { notify, sendEmail, sendWhatsApp, templates, waTemplates };
