import nodemailer from 'nodemailer';
import type { IContact } from 'types/Contact.ts';
import { Email } from 'ui/email';
import ENV from '#api/env.ts';

const mailer = nodemailer.createTransport(ENV.SMTP_URI);

export default class ContactService {
  static async send({ email, message }: IContact.request): Promise<IContact.response> {
    const html = Email.render({ template: 'contact', data: { email, message } });
    await mailer.sendMail({
      attachments: [{ cid: Email.logo.cid, filename: Email.logo.filename, path: Email.logo.path }],
      from: ENV.EMAIL_FROM,
      to: 'damiano.barbati@gmail.com',
      replyTo: email,
      subject: `Pulsio support message from ${email}`,
      html,
    });

    return { message: 'Your message was sent.' };
  }
}
