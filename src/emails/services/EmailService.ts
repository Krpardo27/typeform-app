import { Resend } from "resend";
import { emailConfig } from "../config/config";

type EmailOptions = {
  from?: string;
  to: string;
  subject: string;
  html: string;
  text: string;
};

let client: Resend | undefined;

// Inicialización diferida: la falta de la clave no debe romper la carga de módulos de auth.
function getResend() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY no está definido en variables de entorno");
  }

  return (client ??= new Resend(apiKey));
}

export class EmailService {
  static async send(options: EmailOptions): Promise<void> {
    const resend = getResend();
    const from = options.from ?? emailConfig.from.verification;

    const result = await resend.emails.send({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    if (result.error) {
      console.error("[EMAIL SERVICE] RESEND ERROR", result.error.name);
      throw new Error("Resend failed to send email");
    }
  }
}
