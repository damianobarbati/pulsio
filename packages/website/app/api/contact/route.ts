import nodemailer from 'nodemailer';
import { Email } from 'ui/email';
import { z } from 'zod';

const contactSchema = z.object({ name: z.string().trim().min(1).max(120), email: z.email(), message: z.string().trim().min(10).max(5000) });

export async function POST(request: Request) {
  try {
    const input = contactSchema.parse(await request.json());
    const smtpUri = process.env.SMTP_URI;
    const emailFrom = process.env.EMAIL_FROM;
    if (!smtpUri || !emailFrom) return Response.json({ message: 'Support email is not configured.' }, { status: 503 });
    const mailer = nodemailer.createTransport(smtpUri);
    const html = Email.render({ template: 'contact', data: input });

    await mailer.sendMail({
      attachments: [{ cid: Email.logo.cid, filename: Email.logo.filename, path: Email.logo.path }],
      from: emailFrom,
      to: 'info@pulsio.live',
      replyTo: input.email,
      subject: `Pulsio support message from ${input.name}`,
      html,
    });
    return Response.json({ message: 'Your message was sent.' });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ message: 'Enter a valid name, email, and message.' }, { status: 400 });
    console.error(error);
    return Response.json({ message: 'We could not send your message. Please try again.' }, { status: 500 });
  }
}
