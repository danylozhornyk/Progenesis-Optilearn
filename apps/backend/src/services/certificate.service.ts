import { PDFDocument, rgb, StandardFonts, RGB, LineCapStyle } from 'pdf-lib';
import { prisma } from '../db/prisma';
import { getDetailedCourseProgress } from './users.service';
import { sendCertificateEmail } from '../email/mailer';

// ── Colour palette ─────────────────────────────────────────────
function hex(h: string): RGB {
  const r = parseInt(h.slice(1, 3), 16) / 255;
  const g = parseInt(h.slice(3, 5), 16) / 255;
  const b = parseInt(h.slice(5, 7), 16) / 255;
  return rgb(r, g, b);
}

const INDIGO     = hex('#4f46e5');
const DARK       = hex('#111827');
const GRAY       = hex('#6b7280');
const GREEN      = hex('#16a34a');
const GREEN_LIGHT = hex('#dcfce7');
const AMBER      = hex('#f59e0b');
const AMBER_LIGHT = hex('#fef9c3');
const DIVIDER    = hex('#e5e7eb');
const WHITE      = rgb(1, 1, 1);

// A4 landscape (pt)
const W = 841.89;
const H = 595.28;
const PAD = 56; // content margin

/**
 * Generates a landscape A4 PDF certificate.
 * Returns the raw bytes ready to attach to an email or stream.
 */
export async function generateCertificatePdf(
  fullName: string,
  courseName: string,
  successRate: number,
  issuedAt: Date,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([W, H]);

  // ── Fonts ────────────────────────────────────────────────────
  const bold    = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const timesB  = await doc.embedFont(StandardFonts.TimesRomanBold);
  const timesI  = await doc.embedFont(StandardFonts.TimesRomanItalic);
  const times   = await doc.embedFont(StandardFonts.TimesRoman);

  // ── White background ─────────────────────────────────────────
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: WHITE });

  // ── Double-rule border frame ──────────────────────────────────
  page.drawRectangle({
    x: 14, y: 14, width: W - 28, height: H - 28,
    borderColor: AMBER, borderWidth: 1.5,
  });
  page.drawRectangle({
    x: 20, y: 20, width: W - 40, height: H - 40,
    borderColor: DIVIDER, borderWidth: 0.6,
  });

  // ── Decorative corner circles (clipped at corners) ────────────
  page.drawCircle({ x: W, y: H, size: 150, color: AMBER_LIGHT, opacity: 0.55 });
  page.drawCircle({ x: W, y: H, size: 100, color: hex('#fef3c7'), opacity: 0.45 });
  page.drawCircle({ x: 0, y: 0, size: 100, color: AMBER_LIGHT, opacity: 0.35 });
  page.drawCircle({ x: 0, y: H, size: 70,  color: AMBER_LIGHT, opacity: 0.25 });

  // ── Decorative seal (bottom-right) ────────────────────────────
  const sealX = W - PAD - 36;
  const sealY = 76;
  page.drawCircle({ x: sealX, y: sealY, size: 36, color: hex('#fef3c7'), opacity: 0.9 });
  page.drawCircle({ x: sealX, y: sealY, size: 36, borderColor: AMBER, borderWidth: 1.2 });
  page.drawCircle({ x: sealX, y: sealY, size: 28, borderColor: AMBER, borderWidth: 0.6, opacity: 0.7 });
  const sealTxt = 'PROGENESIS';
  const sealSz  = 5;
  const sealW   = bold.widthOfTextAtSize(sealTxt, sealSz);
  page.drawText(sealTxt, { x: sealX - sealW / 2, y: sealY - 2, size: sealSz, font: bold, color: AMBER });

  // ── PROGENESIS wordmark (top-left, subtle) ────────────────────
  page.drawText('PROGENESIS', {
    x: PAD, y: H - PAD - 2,
    size: 7.5, font: bold, color: GRAY, opacity: 0.45,
  });

  // ── Header: amber dot + "CERTIFICATE OF COMPLETION" ──────────
  const dotR = 5;
  const headingTxt = 'CERTIFICATE OF COMPLETION';
  const headingSz  = 11;
  const headingW   = bold.widthOfTextAtSize(headingTxt, headingSz);
  const headerY    = H - PAD - 4;
  const totalHeaderW = dotR * 2 + 8 + headingW;
  const headerStartX = (W - totalHeaderW) / 2;

  page.drawCircle({ x: headerStartX + dotR, y: headerY + 4, size: dotR, color: AMBER });
  page.drawText(headingTxt, {
    x: headerStartX + dotR * 2 + 8, y: headerY,
    size: headingSz, font: bold, color: GRAY,
  });

  // ── Thin horizontal divider ───────────────────────────────────
  const divY = H - PAD - 26;
  page.drawLine({
    start: { x: PAD, y: divY }, end: { x: W - PAD, y: divY },
    thickness: 0.75, color: DIVIDER,
  });

  // ── "This certifies that" ─────────────────────────────────────
  const certTxt = 'This certifies that';
  const certSz  = 13;
  const certW   = timesI.widthOfTextAtSize(certTxt, certSz);
  page.drawText(certTxt, {
    x: (W - certW) / 2, y: H - PAD - 62,
    size: certSz, font: timesI, color: INDIGO,
  });

  // ── Full name ─────────────────────────────────────────────────
  let nameSz = 44;
  const maxNameW = W - PAD * 4;
  while (timesB.widthOfTextAtSize(fullName, nameSz) > maxNameW && nameSz > 20) nameSz--;
  const nameW = timesB.widthOfTextAtSize(fullName, nameSz);
  const nameY = H - PAD - 118;
  page.drawText(fullName, {
    x: (W - nameW) / 2, y: nameY,
    size: nameSz, font: timesB, color: DARK,
  });

  // Subtle underline beneath the name
  page.drawLine({
    start: { x: (W - nameW) / 2, y: nameY - 6 },
    end:   { x: (W + nameW) / 2, y: nameY - 6 },
    thickness: 0.5, color: DIVIDER,
  });

  // ── "has successfully completed" ─────────────────────────────
  const compTxt = 'has successfully completed';
  const compSz  = 13;
  const compW   = timesI.widthOfTextAtSize(compTxt, compSz);
  const compY   = nameY - nameSz - 16;
  page.drawText(compTxt, {
    x: (W - compW) / 2, y: compY,
    size: compSz, font: timesI, color: INDIGO,
  });

  // ── Course name ───────────────────────────────────────────────
  let cSz = 22;
  const maxCW = W - PAD * 2;
  let displayCourse = courseName;
  while (timesB.widthOfTextAtSize(displayCourse, cSz) > maxCW && displayCourse.length > 8) {
    displayCourse = displayCourse.slice(0, -1);
  }
  if (displayCourse !== courseName) displayCourse += '…';
  const cW = timesB.widthOfTextAtSize(displayCourse, cSz);
  const cY = compY - compSz - 16;
  page.drawText(displayCourse, {
    x: (W - cW) / 2, y: cY,
    size: cSz, font: timesB, color: DARK,
  });

  // ── Bottom panels ─────────────────────────────────────────────
  const panelTop   = 118;
  const panelH     = 84;
  const panelW     = 230;
  const gap        = 20;
  const panelsLeft = (W - panelW * 2 - gap) / 2;

  // Left panel — Final Score
  page.drawRectangle({ x: panelsLeft, y: panelTop, width: panelW, height: panelH, color: AMBER_LIGHT });
  // Amber accent bar at top of panel
  page.drawRectangle({ x: panelsLeft, y: panelTop + panelH - 3, width: panelW, height: 3, color: AMBER });

  const scoreLabelTxt = 'FINAL SCORE';
  const scoreLabelSz  = 7.5;
  const scoreLabelW   = bold.widthOfTextAtSize(scoreLabelTxt, scoreLabelSz);
  page.drawText(scoreLabelTxt, {
    x: panelsLeft + (panelW - scoreLabelW) / 2,
    y: panelTop + panelH - 21,
    size: scoreLabelSz, font: bold, color: hex('#92400e'),
  });

  const rate    = Math.round(successRate);
  const rateTxt = `${rate}%`;
  const rateSz  = 36;
  const rateW   = bold.widthOfTextAtSize(rateTxt, rateSz);
  page.drawText(rateTxt, {
    x: panelsLeft + (panelW - rateW) / 2,
    y: panelTop + 20,
    size: rateSz, font: bold, color: GREEN,
  });

  // Right panel — Status
  const rightPanelX = panelsLeft + panelW + gap;
  page.drawRectangle({
    x: rightPanelX, y: panelTop, width: panelW, height: panelH,
    color: WHITE, borderColor: DIVIDER, borderWidth: 0.75,
  });
  // Green accent bar at top of panel
  page.drawRectangle({ x: rightPanelX, y: panelTop + panelH - 3, width: panelW, height: 3, color: GREEN });

  const statusLabelTxt = 'STATUS';
  const statusLabelSz  = 7.5;
  const statusLabelW   = bold.widthOfTextAtSize(statusLabelTxt, statusLabelSz);
  page.drawText(statusLabelTxt, {
    x: rightPanelX + (panelW - statusLabelW) / 2,
    y: panelTop + panelH - 21,
    size: statusLabelSz, font: bold, color: GREEN,
  });

  // "Passed" badge
  const badgeTxt  = 'Passed';
  const badgeSz   = 13;
  const badgeTxtW = bold.widthOfTextAtSize(badgeTxt, badgeSz);
  const badgePadX = 14;
  const badgePadY = 7;
  const checkSpace = 13;
  const badgeW    = badgeTxtW + badgePadX * 2 + checkSpace;
  const badgeH    = badgeSz + badgePadY * 2;
  const badgeX    = rightPanelX + (panelW - badgeW) / 2;
  const badgeY    = panelTop + (panelH - badgeH) / 2 - 6;

  page.drawRectangle({ x: badgeX, y: badgeY, width: badgeW, height: badgeH, color: GREEN_LIGHT });

  // Proper checkmark drawn with two line segments
  const ckX     = badgeX + badgePadX;
  const ckMidY  = badgeY + badgePadY + 3;
  page.drawLine({
    start: { x: ckX, y: ckMidY + 4 },
    end:   { x: ckX + 3.5, y: ckMidY },
    thickness: 1.8, color: GREEN, lineCap: LineCapStyle.Round,
  });
  page.drawLine({
    start: { x: ckX + 3.5, y: ckMidY },
    end:   { x: ckX + 10,  y: ckMidY + 8 },
    thickness: 1.8, color: GREEN, lineCap: LineCapStyle.Round,
  });

  page.drawText(badgeTxt, {
    x: badgeX + badgePadX + checkSpace, y: badgeY + badgePadY,
    size: badgeSz, font: bold, color: GREEN,
  });

  // ── Issue date ────────────────────────────────────────────────
  const dateTxt = `Issued on ${issuedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
  const dateSz  = 8;
  const dateW   = times.widthOfTextAtSize(dateTxt, dateSz);
  page.drawText(dateTxt, {
    x: (W - dateW) / 2, y: panelTop - 22,
    size: dateSz, font: times, color: GRAY,
  });

  return doc.save();
}

// ── Main request handler ──────────────────────────────────────

/**
 * Validates that the user completed the course, computes the success rate,
 * generates a PDF certificate, and emails it to the user.
 */
export async function requestCourseCertificate(userId: string, courseId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, fullName: true, isEmailVerified: true },
  });
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
  if (!user.isEmailVerified) {
    throw Object.assign(new Error('Email address must be verified before requesting a certificate'), { status: 403 });
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { title: true, titleUk: true, status: true },
  });
  if (!course) throw Object.assign(new Error('Course not found'), { status: 404 });
  if (course.status !== 'PUBLISHED') throw Object.assign(new Error('Course not available'), { status: 404 });

  // Reuse the existing detailed progress function to get earnedMarks / maxMarks
  const allProgress = await getDetailedCourseProgress(userId);
  const cp = allProgress.find((p) => p.courseId === courseId);

  if (!cp || cp.status !== 'COMPLETED') {
    throw Object.assign(new Error('Course not completed'), { status: 400 });
  }

  const successRate = cp.attemptedMaxMarks > 0
    ? (cp.earnedMarks / cp.attemptedMaxMarks) * 100
    : 100;

  const courseName = course.title;
  const issuedAt = new Date();

  const pdfBytes = await generateCertificatePdf(user.fullName, courseName, successRate, issuedAt);

  await sendCertificateEmail({
    email: user.email,
    fullName: user.fullName,
    courseName,
    successRate,
    issuedAt,
    pdfBytes,
  });
}
