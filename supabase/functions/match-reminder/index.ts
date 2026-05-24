// @ts-nocheck — Deno Edge Function: tipos Deno no disponibles en tsconfig de Node
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// user_id del sistema para registros generados por cron (no tiene usuario real)
const SYSTEM_USER_ID = 1;

serve(async (_req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const now = new Date();
    const windowStart = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
    const windowEnd   = new Date(now.getTime() + 16 * 60 * 1000).toISOString();

    // Buscar partidos cuyo deadline de predicción cae en los próximos 15-16 minutos
    const { data: matches, error: matchErr } = await supabase
      .from('MATCH')
      .select('match_id, league_id')
      .gte('end_time', windowStart)
      .lt('end_time', windowEnd)
      .eq('is_deleted', false)
      .is('scored_at', null);

    if (matchErr) {
      console.error('[match-reminder] Error fetching matches:', matchErr.message);
      return new Response(JSON.stringify({ error: matchErr.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!matches || matches.length === 0) {
      return new Response(JSON.stringify({ processed: 0, notifications: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let notifCount = 0;

    for (const match of matches) {
      // Obtener todos los miembros activos de la liga
      const { data: members, error: memberErr } = await supabase
        .from('USER_LEAGUE')
        .select('user_id')
        .eq('league_id', match.league_id)
        .eq('is_deleted', false);

      if (memberErr || !members || members.length === 0) continue;

      const notifications = members.map((m: { user_id: number }) => ({
        user_id: m.user_id,
        created_by: SYSTEM_USER_ID,
        title: '⏰ ¡Últimos 15 minutos para predecir!',
        body: 'El partido de tu liga está a punto de comenzar. Registra tus predicciones antes de que cierre la ventana.',
        notification_type: 'match_reminder',
        priority: 'high',
        league_id: match.league_id,
        match_id: match.match_id,
        is_read: false,
        browser_notification_sent: false,
        is_deleted: false,
      }));

      const { error: insertErr } = await supabase
        .from('NOTIFICATION_INBOX')
        .insert(notifications);

      if (insertErr) {
        console.error(
          `[match-reminder] Failed notifications for match ${match.match_id}:`,
          insertErr.message,
        );
      } else {
        notifCount += notifications.length;
      }
    }

    console.log(`[match-reminder] processed=${matches.length} notifications=${notifCount}`);
    return new Response(
      JSON.stringify({ processed: matches.length, notifications: notifCount }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[match-reminder] Unexpected error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
