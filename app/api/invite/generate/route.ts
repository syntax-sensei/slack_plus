import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Simple function to generate a random code
function generateCode(length: number = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(request: Request) {
  const { userId } = await request.json();

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Generate code and expiration in one go
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Optimize the database operation by doing a single insert
    const { data, error } = await supabase
      .from('invite_codes')
      .insert({
        code,
        created_by: userId,
        expires_at: expiresAt,
        uses_remaining: 5,
        is_active: true,
      })
      .select('code, expires_at')
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json({ error: error.message || 'Failed to create invite code' }, { status: 500 });
    }

    return NextResponse.json({ inviteCode: data });

  } catch (err) {
    console.error('Exception generating invite code via API:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    return NextResponse.json({ error: `Failed to generate invite link: ${errorMessage}` }, { status: 500 });
  }
} 