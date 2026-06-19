export const loginCopy = {
  title: "Acceso a la plataforma",
  subtitle: "Ingresá tu correo para recibir un código de acceso",
  emailLabel: "Correo electrónico",
  emailPlaceholder: "nombre@cl.prisa.media",
  emailSubmit: "Enviar código",
  otpTitle: "Revisá tu correo",
  otpSubtitle: (email: string) =>
    `Te enviamos un código de 6 dígitos a ${email}`,
  otpLabel: "Código de acceso",
  otpSubmit: "Ingresar",
  otpBack: "Usar otro correo",
  otpResend: "Reenviar código",
  genericError: "Si tu correo está autorizado, vas a recibir un código.",
};
