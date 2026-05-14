import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const { email, token, leagueId, type, appUrl } = await req.json() as {
      email: string;
      token: string;
      leagueId: number;
      type: 'existing' | 'anonymous';
      appUrl: string;
    };

    // Fetch league name using service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: league } = await supabase
      .from('LEAGUE')
      .select('name')
      .eq('league_id', leagueId)
      .single();

    const leagueName = league?.name ?? 'una liga';

    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) {
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY no configurado' }),
        { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    const isAnonymous = type === 'anonymous';
    const subject = `Invitación a unirte a la liga "${leagueName}"`;

    const actionUrl = isAnonymous
      ? `${appUrl}/invite?token=${token}`
      : `${appUrl}/home`;

    const actionText = isAnonymous
      ? 'Crear cuenta y unirme'
      : 'Ver mi invitación';

    const bodyHtml = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">

        <!-- Header -->
        <tr>
          <td style="background:#0f172a;padding:32px 40px;text-align:center;">
            <span style="font-size:28px;">🏆</span>
            <h1 style="color:#ffffff;margin:8px 0 0;font-size:20px;font-weight:700;">Mundial</h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <h2 style="color:#0f172a;font-size:22px;font-weight:700;margin:0 0 12px;">
              ¡Tienes una invitación!
            </h2>
            <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 8px;">
              Te han invitado a unirte a la liga <strong style="color:#0f172a;">${leagueName}</strong>.
            </p>
            ${isAnonymous
              ? `<p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px;">
                   Haz clic en el botón para crear tu cuenta y aceptar automáticamente la invitación.
                   Este enlace expira en <strong>48 horas</strong>.
                 </p>`
              : `<p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px;">
                   Inicia sesión en la app para aceptar tu invitación.
                 </p>`
            }

            <!-- CTA -->
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="border-radius:8px;background:#16a34a;">
                  <a href="${actionUrl}"
                     style="display:inline-block;padding:14px 32px;color:#ffffff;
                            font-size:15px;font-weight:600;text-decoration:none;">
                    ${actionText}
                  </a>
                </td>
              </tr>
            </table>

            ${isAnonymous
              ? `<p style="color:#94a3b8;font-size:12px;margin:20px 0 0;word-break:break-all;">
                   O copia este enlace: ${actionUrl}
                 </p>`
              : ''
            }
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="color:#94a3b8;font-size:12px;margin:0;">
              Si no esperabas esta invitación, puedes ignorar este mensaje.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Mundial <invitaciones@re-21-12.app>',
        to: [email],
        subject,
        html: bodyHtml,
      }),
    });

    if (!resendRes.ok) {
      const resendErr = await resendRes.json();
      console.error('[send-invitation-email] Resend error:', resendErr);
      return new Response(
        JSON.stringify({ error: 'Error al enviar el correo', detail: resendErr }),
        { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    const resendData = await resendRes.json();
    return new Response(
      JSON.stringify({ success: true, id: resendData.id }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );

  } catch (err) {
    console.error('[send-invitation-email] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }
});
