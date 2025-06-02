import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { messageContent, threadContext, organizationContext } = await request.json();

    const prompt = `
      You are a helpful AI assistant in a Slack-like chat application.
      Based on the following message and thread context, suggest 3 appropriate responses.
      Keep responses concise, professional, and contextually relevant.
      Return ONLY the 3 responses, one per line, without any numbering or additional formatting.
      
      ${organizationContext ? `Organization Context: ${organizationContext}\n` : ''}
      Thread Context:
      ${threadContext.join('\n')}
      
      Current Message:
      ${messageContent}
      
      Suggest 3 different responses:
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful AI assistant that suggests appropriate responses in a chat application. Return only the responses, one per line, without any numbering or additional formatting."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 150,
      n: 1
    });

    // Split the response into individual suggestions and clean them up
    const suggestions = completion.choices[0].message.content
      ?.split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .slice(0, 3) || [];

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Error generating reply suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
} 