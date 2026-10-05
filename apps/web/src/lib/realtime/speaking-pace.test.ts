import { describe, expect, it } from 'vitest';
import { findPaceRequest } from './speaking-pace';

const call = (args: string, name = 'set_speaking_pace') => ({
  type: 'function_call',
  name,
  call_id: 'call_1',
  arguments: args,
});

describe('findPaceRequest', () => {
  it('finds the pace tool call among the response output', () => {
    const response = {
      output: [{ type: 'message', content: [] }, call('{"pace":"slower"}')],
    };
    expect(findPaceRequest(response)).toEqual({ callId: 'call_1', pace: 'slower' });
  });

  it('ignores other tools, malformed arguments and unknown paces', () => {
    expect(findPaceRequest({ output: [call('{"pace":"slower"}', 'other_tool')] })).toBeUndefined();
    expect(findPaceRequest({ output: [call('not json')] })).toBeUndefined();
    expect(findPaceRequest({ output: [call('{"pace":"fast"}')] })).toBeUndefined();
  });

  it('returns undefined for a response without output', () => {
    expect(findPaceRequest(undefined)).toBeUndefined();
    expect(findPaceRequest({ status: 'completed' })).toBeUndefined();
  });
});
