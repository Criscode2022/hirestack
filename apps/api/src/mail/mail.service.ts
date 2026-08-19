import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null;

  async send(to: string, subject: string, html: string) {
    const payload = { to, subject, html };
    if (!this.resend) {
      this.logger.log(`Email skipped (no RESEND_API_KEY): ${JSON.stringify(payload)}`);
      return;
    }
    await this.resend.emails.send({
      from: 'HireStack <noreply@hirestack.dev>',
      to,
      subject,
      html,
    });
  }
}
