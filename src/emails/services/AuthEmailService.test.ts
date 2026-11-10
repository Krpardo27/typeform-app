import { beforeEach, describe, expect, it, vi } from "vitest";
import { emailConfig } from "../config/config";
import { renderOtpEmail } from "../templates/OtpEmail";
import { AuthEmailService } from "./AuthEmailService";

const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("./EmailService", () => ({ EmailService: { send } }));

beforeEach(() => vi.resetAllMocks());

describe("AuthEmailService", () => {
  it("conserva remitente, destinatario, asunto y alternativa de texto al enviar la plantilla", async () => {
    await AuthEmailService.sendOtpEmail({ email: "persona@example.test", otp: "012345" });
    expect(send).toHaveBeenCalledExactlyOnceWith({
      from: emailConfig.from.verification,
      to: "persona@example.test",
      subject: "Tu código de acceso",
      html: renderOtpEmail({ otp: "012345" }),
      text: "Tu código de acceso es: 012345",
    });
  });

  it("no oculta los errores del servicio de envío", async () => {
    const error = new Error("Error simulado de envío");
    send.mockRejectedValue(error);
    await expect(AuthEmailService.sendOtpEmail({ email: "persona@example.test", otp: "012345" }))
      .rejects.toBe(error);
  });
});