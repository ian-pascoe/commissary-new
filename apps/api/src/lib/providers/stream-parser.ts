export interface StreamChunk {
  id?: string;
  object?: string;
  created?: number;
  model?: string;
  choices?: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
      function_call?: any;
      tool_calls?: any;
    };
    finish_reason?: string | null;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export class StreamParser {
  private buffer = '';
  private decoder = new TextDecoder();

  parseChunk(chunk: Uint8Array): StreamChunk[] {
    this.buffer += this.decoder.decode(chunk, { stream: true });
    
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || ''; // Keep incomplete line in buffer
    
    const events: StreamChunk[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith(':')) {
        continue;
      }
      
      // Parse SSE data lines
      if (trimmed.startsWith('data: ')) {
        const data = trimmed.slice(6);
        
        // Check for end of stream
        if (data === '[DONE]') {
          continue;
        }
        
        try {
          const parsed = JSON.parse(data);
          events.push(parsed);
        } catch (error) {
          console.warn('Failed to parse SSE data:', data, error);
        }
      }
    }
    
    return events;
  }

  finish(): StreamChunk[] {
    // Process any remaining buffer content
    if (this.buffer.trim()) {
      return this.parseChunk(new Uint8Array(0));
    }
    return [];
  }

  static formatSSEChunk(chunk: StreamChunk): string {
    return `data: ${JSON.stringify(chunk)}\n\n`;
  }

  static formatSSEEnd(): string {
    return 'data: [DONE]\n\n';
  }
}