import imaps from 'imap-simple';
import nodemailer from 'nodemailer';
import { simpleParser } from 'mailparser';
import type Database from 'better-sqlite3';

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
  private db: Database.Database;
  private smtpTransport: nodemailer.Transporter;

  constructor(config: EmailConfig, db: Database.Database) {
    this.config = config;
    this.db = db;
    
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

      // Search for all emails (we'll filter by DB records ourselves)
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

        // Check if already seen in DB
        const existing = this.db.prepare('SELECT id FROM inbound_emails WHERE message_id = ?').get(messageId);
        if (existing) {
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

        // Insert into DB with status='new'
        this.db.prepare(`
          INSERT INTO inbound_emails (message_id, from_email, subject, body, status)
          VALUES (?, ?, ?, ?, 'new')
        `).run(messageId, fromAddress, parsed.subject || '(no subject)', body);
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
