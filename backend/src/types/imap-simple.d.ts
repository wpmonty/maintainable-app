declare module 'imap-simple' {
  export interface ImapConfig {
    imap: {
      user: string;
      password: string;
      host: string;
      port: number;
      tls: boolean;
      tlsOptions?: Record<string, any>;
      authTimeout?: number;
    };
  }

  export interface MessagePart {
    which: string;
    body: Buffer | string;
  }

  export interface Message {
    attributes: {
      uid: number;
      flags: string[];
      date?: Date;
    };
    parts: MessagePart[];
  }

  export interface Connection {
    openBox(boxName: string): Promise<any>;
    search(criteria: any[], fetchOptions: any): Promise<Message[]>;
    end(): Promise<void>;
  }

  export function connect(config: ImapConfig): Promise<Connection>;
}
