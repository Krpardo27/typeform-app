import { emailConfig } from "../config/config";
import { renderOtpEmail } from "../templates/OtpEmail";
import { EmailService } from "./EmailService";

export class AuthEmailService {
  static async sendOtpEmail(data: {
    email: string;
    otp: string;
  }): Promise<void> {
    await EmailService.send({
      from: emailConfig.from.verification,
      to: data.email,
      subject: "Tu código de acceso",
      html: renderOtpEmail(data),
      text: `Tu código de acceso es: ${data.otp}`,
    });
  }
}