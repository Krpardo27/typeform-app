import { Resend } from "resend";
import { emailConfig } from "../config/config";

type EmailOptions = {
  from?: string;
  to: string;
  subject: string;
  html: string;
  text: string;
};

const apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
  throw new Error("RESEND_API_KEY no está definido en variables de entorno");
}

const resend = new Resend(apiKey);

export class EmailService {
  static async send(options: EmailOptions): Promise<void> {
    const from = options.from ?? emailConfig.from.verification;

    console.log("[EMAIL SERVICE] send called", {
      from,
      to: options.to,
      subject: options.subject,
    });

    try {
      console.log("[EMAIL SERVICE] sending email...");

      const result = await resend.emails.send({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      console.log("[EMAIL SERVICE] resend response", result);

      if (result.error) {
        console.error("[EMAIL SERVICE] RESEND ERROR RESPONSE", result.error);
        throw new Error("Resend failed to send email");
      }
    } catch (err) {
      console.error("[EMAIL SERVICE] ERROR sending email", err);

      throw err;
    }
  }
}
