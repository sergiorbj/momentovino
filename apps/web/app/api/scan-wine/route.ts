import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth'
import { genai } from '@/lib/gemini'
import { SCAN_WINE_LABEL_PROMPT } from '@/lib/prompts/scan-wine-label'

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if (auth instanceof NextResponse) return auth

  try {
    const body = await req.json()
    const { image, mimeType } = body as { image?: string; mimeType?: string }

    if (!image || !mimeType) {
      return NextResponse.json(
        { error: 'Missing image or mimeType in request body' },
        { status: 400 }
      )
    }

    const response = await genai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [
          { text: SCAN_WINE_LABEL_PROMPT },
          { inlineData: { data: image, mimeType } },
        ]},
      ],
      config: {
        responseMimeType: 'application/json',
      },
    })

    const text = response.text ?? ''
    const parsed = JSON.parse(text)

    return NextResponse.json(parsed)
  } catch (err) {
    console.error('Scan wine error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to scan wine' },
      { status: 500 }
    )
  }
}
