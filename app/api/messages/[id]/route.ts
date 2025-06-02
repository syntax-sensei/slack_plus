import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const messageId = params.id;

    if (!messageId) {
      console.error('Delete Message API Error: Message ID is missing.');
      return NextResponse.json({ error: 'Message ID is required.' }, { status: 400 });
    }

    // Start a transaction if your Supabase client supports it, or handle sequentially
    // For simplicity in this example, we'll perform sequential deletes.

    // Delete replies first
    const { error: deleteRepliesError } = await supabase
      .from('messages')
      .delete()
      .eq('parent_message_id', messageId);

    if (deleteRepliesError) {
      console.error(`Delete Message API Error: Failed to delete replies for message ${messageId}:`, deleteRepliesError);
      // Depending on requirements, you might stop here or attempt to delete the parent anyway
      return NextResponse.json(
        { error: 'Failed to delete message replies.', details: deleteRepliesError },
        { status: 500 }
      );
    }
    
    console.log(`Delete Message API: Successfully deleted replies for message ${messageId}.`);

    // Then delete the parent message
    const { error: deleteParentError } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);

    if (deleteParentError) {
      console.error(`Delete Message API Error: Failed to delete parent message ${messageId}:`, deleteParentError);
      return NextResponse.json(
        { error: 'Failed to delete parent message.', details: deleteParentError },
        { status: 500 }
      );
    }

    console.log(`Delete Message API: Successfully deleted parent message ${messageId}.`);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete Message API Error: Uncaught error processing request:', error);
    return NextResponse.json(
      { error: 'An unexpected server error occurred.' },
      { status: 500 }
    );
  }
} 