import { createClient } from 'npm:@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const ALLOWED_ROLES = ['admin', 'user', 'observer']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    })
  }

  try {
    const { role, newPassword } = await req.json()

    if (!ALLOWED_ROLES.includes(role)) {
      throw new Error('Rôle non autorisé')
    }

    if (!newPassword || newPassword.length < 8) {
      throw new Error('Le mot de passe doit contenir au moins 8 caractères')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { error: updateError } = await supabaseClient
      .from('userapplication')
      .update({ password_hash: newPassword })
      .eq('role', role)

    if (updateError) throw updateError

    return new Response(
      JSON.stringify({ message: 'Mot de passe mis à jour avec succès' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})