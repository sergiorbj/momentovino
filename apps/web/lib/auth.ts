import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from './supabase-admin'

export async function authenticateRequest(
  req: NextRequest
): Promise<{ userId: string } | NextResponse> {
  const header = req.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 })
  }

  const token = header.slice(7)
  const { data, error } = await supabaseAdmin.auth.getUser(token)

  if (error || !data.user) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
  }

  return { userId: data.user.id }
}
