import nodemailer from 'nodemailer';
import ENV from '#api/env.ts';

const mailer = nodemailer.createTransport(ENV.SMTP_URI);

export const AccountEmail = {
  async sendVerification({ email, token }: { email: string; token: string }) {
    const verificationUrl = new URL('/auth/verify', ENV.API_URL);
    verificationUrl.searchParams.set('token', token);
    await mailer.sendMail({
      from: ENV.EMAIL_FROM,
      to: email,
      subject: 'Verify your Pulsio email address',
      text: `Verify your email address within one hour: ${verificationUrl}`,
    });
  },
};
