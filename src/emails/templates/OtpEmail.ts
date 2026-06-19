type OtpEmailData = {
  otp: string;
};

export function renderOtpEmail({ otp }: OtpEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Código de verificación</title>
</head>

<body style="
  margin:0;
  padding:0;
  background:#0b0b0c;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
">

  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr>
      <td align="center">

        <table width="100%" cellpadding="0" cellspacing="0" style="
          max-width:520px;
          background:#111113;
          border:1px solid rgba(255,255,255,0.06);
          border-radius:16px;
        ">

          <tr>
            <td style="padding:32px;">

              <h1 style="
                margin:0 0 8px 0;
                font-size:20px;
                color:#ffffff;
                font-weight:700;
              ">
                Código de verificación
              </h1>

              <p style="
                margin:0 0 24px 0;
                font-size:14px;
                color:#a1a1aa;
                line-height:20px;
              ">
                Usa este código para acceder a la plataforma.
              </p>

              <div style="
                text-align:center;
                padding:20px;
                border-radius:12px;
                background:#18181b;
                border:1px solid rgba(255,255,255,0.06);
              ">

                <div style="
                  font-size:32px;
                  font-weight:700;
                  letter-spacing:6px;
                  color:#C8A96E;
                  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
                ">
                  ${otp}
                </div>

                <div style="
                  margin-top:8px;
                  font-size:12px;
                  color:#71717a;
                ">
                  Código único · válido por 5 minutos
                </div>

              </div>

              <p style="
                margin:24px 0 0 0;
                font-size:12.5px;
                color:#71717a;
                line-height:18px;
              ">
                Si no solicitaste este código, puedes ignorar este correo.
              </p>

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
