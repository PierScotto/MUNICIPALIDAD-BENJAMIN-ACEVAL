import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${process.env.BASE_URL}/api/auth/verify?token=${token}`;
  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: email,
    subject: 'Verifica tu email',
    html: `<p>Haz clic en el siguiente enlace para verificar tu email:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`
  });
}