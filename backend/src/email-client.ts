import imaps from 'imap-simple';
import nodemailer from 'nodemailer';
import { simpleParser } from 'mailparser';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface EmailConfig {
  email: string;
  password: string;
  imap: {
    host: string;
    port: number;
    ssl: boolean;
  };
  smtp: {
    host: string;
    port: number;
    ssl: boolean;
  };
}

export interface ParsedEmail {
  from: string;
  subject: string;
  body: string;
  messageId: string;
  inReplyTo?: string;
  date: Date;
}

export class EmailClient {
  private config: EmailConfig;
  private seenIdsPath: string;
  private seenIds: Set<string>;
  private smtpTransport: nodemailer.Transporter;

  constructor(config: EmailConfig, seenIdsPath?: string) {
    this.config = config;
    this.seenIdsPath = seenIdsPath ?? join(__dirname, '..', 'data', 'seen_ids.json');
    this.seenIds = this.loadSeenIds();
    
    // Initialize SMTP transport
    this.smtpTransport = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.ssl,
      auth: {
        user: config.email,
        pass: config.password,
      },
    });
  }

  private loadSeenIds(): Set<string> {
    if (!existsSync(this.seenIdsPath)) {
      return new Set();
    }
    try {
      const data = readFileSync(this.seenIdsPath, 'utf8');
      const ids = JSON.parse(data);
      return new Set(ids);
    } catch (error) {
      console.error('[email-client] Failed to load seen IDs:', error);
      return new Set();
    }
  }

  private saveSeenIds(): void {
    try {
      const dir = dirname(this.seenIdsPath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(this.seenIdsPath, JSON.stringify(Array.from(this.seenIds), null, 2));
    } catch (error) {
      console.error('[email-client] Failed to save seen IDs:', error);
    }
  }

  /**
   * Poll IMAP for new emails
   */
  async pollNewEmails(): Promise<ParsedEmail[]> {
    let connection: any;
    try {
      connection = await imaps.connect({
        imap: {
          user: this.config.email,
          password: this.config.password,
          host: this.config.imap.host,
          port: this.config.imap.port,
          tls: this.config.imap.ssl,
          tlsOptions: { rejectUnauthorized: false },
          authTimeout: 10000,
        },
      });

      await connection.openBox('INBOX');

      // Search for all emails (we'll filter by seen IDs ourselves)
      const searchCriteria = ['ALL'];
      const fetchOptions = {
        bodies: ['HEADER', 'TEXT', ''],
        markSeen: false,
      };

      const messages = await connection.search(searchCriteria, fetchOptions);
      const newEmails: ParsedEmail[] = [];

      for (const item of messages) {
        const all = item.parts.find((p: any) => p.which === '');
        if (!all || !all.body) continue;

        const parsed = await simpleParser(all.body);
        const messageId = parsed.messageId || `${Date.now()}-${Math.random()}`;

        // Skip if already seen
        if (this.seenIds.has(messageId)) {
          continue;
        }

        // Extract plain text body
        let body = '';
        if (parsed.text) {
          body = parsed.text.trim();
        } else if (parsed.html) {
          // Strip HTML tags for plain text
          body = parsed.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        }

        // Skip empty emails
        if (!body) continue;

        // Extract sender email
        const fromAddress = parsed.from?.value[0]?.address || '';
        if (!fromAddress) continue;

        newEmails.push({
          from: fromAddress,
          subject: parsed.subject || '(no subject)',
          body,
          messageId,
          inReplyTo: parsed.inReplyTo,
          date: parsed.date || new Date(),
        });

        // Mark as seen
        this.seenIds.add(messageId);
      }

      // Save seen IDs after processing
      if (newEmails.length > 0) {
        this.saveSeenIds();
      }

      await connection.end();
      return newEmails;
    } catch (error: any) {
      console.error('[email-client] IMAP poll error:', error.message);
      if (connection) {
        try {
          await connection.end();
        } catch {}
      }
      return [];
    }
  }

  /**
   * Send an email reply
   */
  async sendReply(
    to: string,
    subject: string,
    body: string,
    inReplyTo?: string
  ): Promise<void> {
    try {
      const mailOptions: nodemailer.SendMailOptions = {
        from: this.config.email,
        to,
        subject,
        text: body,
      };

      if (inReplyTo) {
        mailOptions.inReplyTo = inReplyTo;
        mailOptions.references = inReplyTo;
      }

      await this.smtpTransport.sendMail(mailOptions);
      console.log(`[email-client] Sent email to ${to}`);
    } catch (error: any) {
      console.error('[email-client] SMTP send error:', error.message);
      throw error;
    }
  }

  /**
   * Test IMAP connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const connection = await imaps.connect({
        imap: {
          user: this.config.email,
          password: this.config.password,
          host: this.config.imap.host,
          port: this.config.imap.port,
          tls: this.config.imap.ssl,
          tlsOptions: { rejectUnauthorized: false },
          authTimeout: 10000,
        },
      });
      await connection.end();
      console.log('[email-client] IMAP connection successful');
      return true;
    } catch (error: any) {
      console.error('[email-client] IMAP connection failed:', error.message);
      return false;
    }
  }
}
