type OtpEmailData = {
  otp: string;
};

export function renderOtpEmail({ otp }: OtpEmailData): string {
  const safeOtp = otp
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

  return `
<!DOCTYPE html>
<html lang="es" dir="ltr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Tu código de acceso</title>
</head>
<body style="margin:0;padding:0;background:#F7F7F6;color:#171717;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <div aria-hidden="true" style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
    Usa este código para iniciar sesión. Caduca en 5 minutos.
  </div>
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="width:100%;background:#F7F7F6;">
    <tr>
      <td align="center" style="padding:32px 12px;">
        <!--[if mso]>
        <table width="500" cellpadding="0" cellspacing="0" border="0" role="presentation"><tr><td>
        <![endif]-->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="width:100%;max-width:500px;background:#FFFFFF;border:1px solid #E5E5E5;border-radius:8px;">
          <tr>
            <td style="padding:28px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                <tr>
                  <td style="border-left:3px solid #FF5C35;padding-left:10px;">
                    <p style="margin:0;font-size:12px;line-height:18px;font-weight:600;color:#595954;">
                      Plataforma de Formularios
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:24px;">
                    <h1 style="margin:0;font-size:22px;line-height:28px;font-weight:600;color:#171717;">
                      Tu código de acceso
                    </h1>
                    <p style="margin:10px 0 0;font-size:14px;line-height:22px;color:#595954;">
                      Introduce este código de 6 dígitos en la pantalla de inicio de sesión.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                      <tr>
                        <td align="center" style="padding:20px 12px;background:#FFF8F5;border:1px solid #FFE1D7;border-radius:6px;">
                          <p dir="ltr" style="margin:0;font-family:Consolas,'Liberation Mono',Menlo,monospace;font-size:32px;line-height:40px;font-weight:600;letter-spacing:4px;white-space:nowrap;color:#A33116;">${safeOtp}</p>
                          <p style="margin:10px 0 0;font-size:13px;line-height:20px;color:#595954;">
                            Válido durante 5 minutos
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:20px;">
                    <p style="margin:0;font-size:14px;line-height:22px;color:#595954;">
                      No compartas este código con nadie. Si no solicitaste el acceso, puedes ignorar este correo.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                      <tr>
                        <td style="border-top:1px solid #E5E5E5;padding-top:16px;">
                          <p style="margin:0;font-size:12px;line-height:18px;color:#737373;">
                            Correo automático. No es necesario responder.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <!--[if mso]></td></tr></table><![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>
`;
}
