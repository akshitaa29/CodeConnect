import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

function buildSafeSummary(summary) {
  if (!summary) {
    return "";
  }

  return String(summary).trim().slice(0, 180);
}

async function sendMail({ to, subject, html }) {
  if (!to) {
    return;
  }

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
  });
}

export async function sendLikeEmail({ toEmail, likerName, likerSummary }) {
  const summary = buildSafeSummary(likerSummary);
  const summaryMarkup = summary ? `<p><strong>About them:</strong> ${summary}</p>` : "";

  await sendMail({
    to: toEmail,
    subject: "Someone liked your profile \uD83D\uDC40",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Someone liked your profile</h2>
        <p><strong>${likerName || "A CodeConnect user"}</strong> liked your profile.</p>
        ${summaryMarkup}
        <p>Check your matches on CodeConnect.</p>
      </div>
    `,
  });
}

async function sendSingleMatchEmail({ toEmail, otherUserName, otherUserSummary }) {
  const summary = buildSafeSummary(otherUserSummary);
  const summaryMarkup = summary ? `<p><strong>About your match:</strong> ${summary}</p>` : "";

  await sendMail({
    to: toEmail,
    subject: "It's a Match! \uD83C\uDF89",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>It's a Match!</h2>
        <p>You and <strong>${otherUserName || "another CodeConnect user"}</strong> liked each other.</p>
        ${summaryMarkup}
        <p>Check your matches on CodeConnect.</p>
      </div>
    `,
  });
}

export async function sendMatchEmail({ firstUser, secondUser }) {
  await Promise.all([
    sendSingleMatchEmail({
      toEmail: firstUser?.email,
      otherUserName: secondUser?.name,
      otherUserSummary: secondUser?.profile || secondUser?.about || secondUser?.bio,
    }),
    sendSingleMatchEmail({
      toEmail: secondUser?.email,
      otherUserName: firstUser?.name,
      otherUserSummary: firstUser?.profile || firstUser?.about || firstUser?.bio,
    }),
  ]);
}
