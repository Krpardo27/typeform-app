import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY no está definida");
}

export const resend = new Resend(process.env.RESEND_API_KEY);

console.log("[RESEND INIT]", {
  keyPrefix: process.env.RESEND_API_KEY?.slice(0, 5),
});