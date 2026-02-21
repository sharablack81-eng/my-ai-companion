import { Message, Conversation } from '@/types/chat';

export async function sendMessage(messages: Message[]): Promise<string> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      if (errorData && errorData.error) {
        throw new Error(`Server error: ${errorData.error}`);
      }
      throw new Error(`Server returned an error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.success && data.reply) {
      return data.reply;
    } else if (data.error) {
      throw new Error(data.error);
    } else {
      throw new Error('Received an unexpected response format from the server.');
    }

  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
}

export async function getConversations(): Promise<Conversation[]> {
  console.log("chat-api: getConversations (mock)");
  return Promise.resolve([]);
}

export async function createConversation(title: string): Promise<Conversation> {
  console.log(`chat-api: createConversation with title "${title}" (mock)`);
  const newConversation: Conversation = {
    id: crypto.randomUUID(),
    title: title,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  return Promise.resolve(newConversation);
}

export async function deleteConversation(id: string): Promise<boolean> {
  console.log(`chat-api: deleteConversation with id "${id}" (mock)`);
  return Promise.resolve(true);
}

export async function saveMessage(message: Omit<Message, 'id' | 'created_at'>): Promise<Message> {
  console.log("chat-api: saveMessage (mock)");
  const newMessage: Message = {
    id: crypto.randomUUID(),
    ...message,
    created_at: new Date().toISOString(),
  };
  return Promise.resolve(newMessage);
}

export async function updateConversationTitle(id: string, title: string): Promise<Conversation> {
    console.log(`chat-api: updateConversationTitle with id "${id}" (mock)`);
    const updatedConversation: Conversation = {
        id: id,
        title: title,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
    return Promise.resolve(updatedConversation);
}

export async function getMessages(conversationId: string): Promise<Message[]> {
    console.log(`chat-api: getMessages for conversation "${conversationId}" (mock)`);
    return Promise.resolve([]);
}

export async function streamChat(options: { messages: Omit<Message, 'id' | 'created_at'>[], onDelta: (delta: string) => void, onDone: () => void, signal: AbortSignal }): Promise<void> {
    console.log("chat-api: streamChat (mock)");
    const { messages, onDelta, onDone, signal } = options;
    const reply = await sendMessage(messages.map(m => ({ ...m, id: 'mock-id', created_at: '' })));
    
    let i = 0;
    const interval = setInterval(() => {
        if (i < reply.length) {
            onDelta(reply[i]);
            i++;
        } else {
            clearInterval(interval);
            onDone();
        }
    }, 50);

    signal.addEventListener('abort', () => {
        clearInterval(interval);
    });
}
