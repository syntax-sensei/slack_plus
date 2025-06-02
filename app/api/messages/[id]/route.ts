import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Ensure params is properly awaited
    const { id: messageId } = await Promise.resolve(params);

    if (!messageId) {
      console.error('Delete Message API Error: Message ID is missing.');
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }

    // First delete all replies associated with this message
    const { error: repliesError } = await supabase
      .from('messages')
      .delete()
      .eq('parent_message_id', messageId);

    if (repliesError) {
      console.error('Delete Message API Error:', repliesError);
      return NextResponse.json({ error: 'Failed to delete message replies' }, { status: 500 });
    }

    console.log(`Delete Message API: Successfully deleted replies for message ${messageId}.`);

    // Then delete the parent message
    const { error: messageError } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);

    if (messageError) {
      console.error('Delete Message API Error:', messageError);
      return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
    }

    console.log(`Delete Message API: Successfully deleted parent message ${messageId}.`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete Message API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 