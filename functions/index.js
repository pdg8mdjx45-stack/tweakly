/**
 * Firebase Cloud Functions for Tweakly Email Verification
 *
 * SMTP config via Firebase Functions environment:
 *   firebase functions:config:set \
 *     smtp.host="smtp.example.com" \
 *     smtp.port="587" \
 *     smtp.user="noreply@tweakly.nl" \
 *     smtp.pass="yourpassword" \
 *     smtp.from_name="Tweakly"
 *
 * Deployment:
 *   firebase deploy --only functions
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();

/** Lazy-initialized SMTP transporter (reused across warm invocations). */
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

/** Returns the sender address from environment variables. */
function fromAddress() {
  const name = process.env.SMTP_FROM_NAME ?? 'Tweakly';
  const user = process.env.SMTP_USER ?? 'noreply@tweaklyapp.com';
  return `"${name}" <${user}>`;
}

/**
 * Branded HTML email for verification / password reset.
 * @param {string} link
 * @param {'verify'|'reset'} type
 */
function buildHtml(link, type = 'verify') {
  const isReset = type === 'reset';
  const title = isReset ? 'Wachtwoord resetten' : 'Verifieer je e-mailadres';
  const body = isReset
    ? 'Klik op de onderstaande knop om een nieuw wachtwoord in te stellen.'
    : 'Bedankt voor het aanmaken van je Tweakly-account! Klik op de onderstaande knop om je e-mailadres te verifiëren.';
  const btnLabel = isReset ? 'Wachtwoord resetten' : 'E-mailadres verifiëren';
  const expiry = isReset ? '1 uur' : '24 uur';

  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .card { background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); padding: 40px 30px; text-align: center; }
    .logo { font-size: 32px; font-weight: 800; color: #ff6600; margin-bottom: 24px; letter-spacing: -0.5px; }
    .title { font-size: 24px; font-weight: 600; color: #333333; margin-bottom: 16px; }
    .description { font-size: 16px; color: #666666; line-height: 1.5; margin-bottom: 32px; }
    .button { display: inline-block; background-color: #ff6600; color: #ffffff !important; font-size: 16px; font-weight: 600; text-decoration: none; padding: 16px 32px; border-radius: 8px; }
    .fallback { margin-top: 16px; font-size: 12px; color: #999999; word-break: break-all; }
    .footer { margin-top: 32px; padding-top: 24px; border-top: 1px solid #eeeeee; font-size: 14px; color: #999999; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">tweakly</div>
      <div class="title">${title}</div>
      <div class="description">${body}</div>
      <a href="${link}" class="button">${btnLabel}</a>
      <div class="fallback">
        Link werkt niet? Open: <a href="${link}" style="color:#ff6600;">${link}</a>
      </div>
      <div class="footer">
        <p>Als je dit niet hebt aangevraagd, kun je deze e-mail negeren.</p>
        <p>Deze link vervalt over ${expiry}.</p>
        <p>&copy; ${new Date().getFullYear()} Tweakly. Alle rechten voorbehouden.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Cloud Function: sendCustomVerificationEmail
 *
 * Generates a Firebase email-verification link and sends it via SMTP.
 *
 * Request body: { email: string }
 */
exports.sendCustomVerificationEmail = functions.https.onCall(async (data) => {
  const { email } = data;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    throw new functions.https.HttpsError('invalid-argument', 'Geldig e-mailadres is vereist.');
  }

  const link = await admin.auth().generateEmailVerificationLink(email).catch((err) => {
    functions.logger.error('generateEmailVerificationLink failed', err);
    if (err.code === 'auth/invalid-email') {
      throw new functions.https.HttpsError('invalid-argument', 'Ongeldig e-mailadres.');
    }
    throw new functions.https.HttpsError('internal', 'Kon verificatielink niet aanmaken.');
  });

  await getTransporter().sendMail({
    from: fromAddress(),
    to: email,
    subject: 'Verifieer je e-mailadres – Tweakly',
    html: buildHtml(link, 'verify'),
  }).catch((err) => {
    functions.logger.error('SMTP sendMail failed', err);
    throw new functions.https.HttpsError('internal', 'E-mail kon niet worden verzonden.');
  });

  functions.logger.info(`Verification email sent to ${email}`);
  return { success: true };
});

/**
 * Cloud Function: sendPasswordResetEmail
 *
 * Generates a Firebase password-reset link and sends it via SMTP.
 *
 * Request body: { email: string }
 */
exports.sendPasswordResetEmail = functions.https.onCall(async (data) => {
  const { email } = data;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    throw new functions.https.HttpsError('invalid-argument', 'Geldig e-mailadres is vereist.');
  }

  const link = await admin.auth().generatePasswordResetLink(email).catch((err) => {
    functions.logger.error('generatePasswordResetLink failed', err);
    if (err.code === 'auth/invalid-email' || err.code === 'auth/user-not-found') {
      // Don't reveal whether the address exists
      return null;
    }
    throw new functions.https.HttpsError('internal', 'Kon resetlink niet aanmaken.');
  });

  // Silently succeed for unknown addresses (security: no user enumeration)
  if (!link) return { success: true };

  await getTransporter().sendMail({
    from: fromAddress(),
    to: email,
    subject: 'Wachtwoord resetten – Tweakly',
    html: buildHtml(link, 'reset'),
  }).catch((err) => {
    functions.logger.error('SMTP sendMail failed', err);
    throw new functions.https.HttpsError('internal', 'E-mail kon niet worden verzonden.');
  });

  functions.logger.info(`Password-reset email sent to ${email}`);
  return { success: true };
});

/**
 * Cloud Function: onUserCreated
 *
 * Automatically sends a verification email when a new user registers.
 */
exports.onUserCreated = functions.auth.user().onCreate(async (user) => {
  const { email } = user;
  if (!email) return null;

  const link = await admin.auth().generateEmailVerificationLink(email).catch((err) => {
    functions.logger.error('generateEmailVerificationLink (onCreate) failed', err);
    return null;
  });

  if (!link) return null;

  await getTransporter().sendMail({
    from: fromAddress(),
    to: email,
    subject: 'Verifieer je e-mailadres – Tweakly',
    html: buildHtml(link, 'verify'),
  }).catch((err) => {
    functions.logger.error('SMTP sendMail (onCreate) failed', err);
  });

  functions.logger.info(`Welcome verification email sent to ${email}`);
  return null;
});
