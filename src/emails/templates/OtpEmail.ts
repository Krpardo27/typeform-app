type OtpEmailData = {
  otp: string;
};

export function renderOtpEmail({ otp }: OtpEmailData): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Código de verificación</title>
</head>

<body style="
  margin:0;
  padding:0;
  background:#F7F7F6;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;
">

  <table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    role="presentation"
    style="
      width:100%;
      background:#F7F7F6;
    "
  >
    <tr>
      <td align="center" style="padding:56px 16px;">

        <!-- Card -->
        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          role="presentation"
          style="
            width:100%;
            max-width:500px;
            background:#FFFFFF;
            border:1px solid #E8E8E6;
            border-radius:18px;
          "
        >
          <tr>
            <td style="padding:36px;">

              <!-- Brand -->
              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                role="presentation"
              >
              </table>
              
              <!-- Title -->
              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                role="presentation"
                style="margin-top:32px;"
              >
                <tr>
                  <td align="center">

                    <h1 style="
                      margin:0;
                      font-size:24px;
                      line-height:30px;
                      color:#111111;
                      font-weight:700;
                    ">
                      Código de verificación
                    </h1>

                    <p style="
                      margin:10px 0 0 0;
                      font-size:14px;
                      line-height:21px;
                      color:#111111;
                      opacity:0.55;
                    ">
                      Usa el siguiente código para continuar con tu acceso.
                    </p>

                  </td>
                </tr>
              </table>

              <!-- OTP -->
              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                role="presentation"
                style="margin-top:28px;"
              >
                <tr>
                  <td
                    align="center"
                    style="
                      padding:26px 20px;
                      background:#FFF8F5;
                      border:1px solid #FFE1D7;
                      border-radius:14px;
                    "
                  >

                    <div style="
                      font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;
                      font-size:34px;
                      line-height:42px;
                      font-weight:700;
                      letter-spacing:7px;
                      color:#FF5C35;
                    ">
                      ${otp}
                    </div>

                    <div style="
                      margin-top:9px;
                      font-size:12px;
                      line-height:18px;
                      color:#111111;
                      opacity:0.45;
                    ">
                      Válido durante 5 minutos
                    </div>

                  </td>
                </tr>
              </table>

              <!-- Security notice -->
              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                role="presentation"
                style="margin-top:24px;"
              >
                <tr>
                  <td
                    style="
                      padding:14px 16px;
                      background:#F7F7F6;
                      border-radius:10px;
                    "
                  >
                    <p style="
                      margin:0;
                      font-size:12px;
                      line-height:18px;
                      color:#111111;
                      opacity:0.55;
                    ">
                      Si no solicitaste este código, puedes ignorar este correo.
                      Por seguridad, no compartas este código con nadie.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Footer -->
              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                role="presentation"
                style="margin-top:28px;"
              >
                <tr>
                  <td
                    align="center"
                    style="
                      padding-top:18px;
                      border-top:1px solid #E8E8E6;
                    "
                  >
                    <p style="
                      margin:0;
                      font-size:11px;
                      line-height:16px;
                      color:#111111;
                      opacity:0.35;
                    ">
                      Este es un correo automático. No es necesario responder.
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
</body>
</html>
`;
}
