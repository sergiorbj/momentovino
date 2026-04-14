import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if (auth instanceof NextResponse) return auth

  const { data, error } = await supabaseAdmin
    .from('wines')
    .select('*')
    .eq('created_by', auth.userId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if (auth instanceof NextResponse) return auth

  try {
    const body = await req.json()
    const { name, producer, vintage, region, country, type } = body as {
      name?: string
      producer?: string
      vintage?: number
      region?: string
      country?: string
      type?: string
    }

    if (!name || name.trim().length < 2) {
      return NextResponse.json({ error: 'Wine name is required (min 2 chars)' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('wines')
      .insert({
        created_by: auth.userId,
        name: name.trim(),
        producer: producer?.trim() || null,
        vintage: vintage ?? null,
        region: region?.trim() || null,
        country: country?.trim() || null,
        type: type || null,
      })
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? 'Failed to create wine' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Invalid request body' },
      { status: 400 }
    )
  }
}
