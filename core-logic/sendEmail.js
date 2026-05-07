import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

console.log("Using SMTP:", process.env.EMAIL_HOST, process.env.EMAIL_PORT);

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false, // true only for port 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Send email safely (never crash server)
 */
export async function sendEmail(to, subject, message) {
  if (!to) {
    console.warn("⚠️ Email skipped: no recipient");
    return;
  }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif">
          <h3>${subject}</h3>
          <p>${message}</p>
          <hr />
          <small>This is an automated email from CodeConnect.</small>
        </div>
      `,
    });
    // console.log("SMTP HOST:", process.env.EMAIL_HOST);
    console.log(`📧 Email sent to ${to}`);
  } catch (error) {
    console.error("❌ Email failed:", error.message);
  }
}
