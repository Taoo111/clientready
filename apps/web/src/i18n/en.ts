/** Candidate-facing strings (English). */
export const en = {
  appName: 'ClientReady',
  tagline: 'Can you handle a real conversation with a client in English?',

  loading: 'Loading…',
  retry: 'Try again',
  footer: 'Your recording is only shared with the recruiter who invited you.',
  poweredBy: 'Powered by',

  steps: ['Consent', 'Microphone', 'Conversation'] as const,

  preparing: {
    title: 'Preparing your conversation…',
    body: 'This can take up to a minute. Please keep this page open.',
  },

  errors: {
    notFound: {
      title: 'This link doesn’t work',
      body: 'Please check that you opened the complete link from your invitation. If it still doesn’t work, ask your recruiter for a new one.',
    },
    expired: {
      title: 'This link has expired',
      body: 'Invitation links are valid for a limited time. Please ask your recruiter to send you a new link.',
    },
    alreadyCompleted: {
      title: 'This conversation is already done',
      body: 'Thank you — your conversation has been recorded. There is nothing more you need to do; your recruiter will be in touch.',
    },
    network: {
      title: 'We can’t reach the server',
      body: 'Please check your internet connection, then try again.',
    },
    unsupported: {
      title: 'Please use a different browser',
      body: 'This conversation needs a recent version of Chrome, Edge, Firefox or Safari on a computer, with microphone access.',
    },
  },

  consent: {
    talkingTo: 'You will talk to',
    aiCharacter: 'An AI character playing a client — not a real person.',
    title: (name: string) => `Hi ${name}, welcome`,
    intro: (role: string, company?: string) =>
      `This is a relaxed, 12-minute conversation in English for the ${role} role${company ? ` at ${company}` : ''} — like a first call with a new client.`,
    points: [
      {
        title: 'You’ll talk to an AI',
        body: 'An AI plays a client. It will ask about your recent work and go through a typical project situation with you.',
      },
      {
        title: 'The call is recorded',
        body: 'The audio is recorded and transcribed so it can be reviewed.',
      },
      {
        title: 'A person makes the decision',
        body: 'The AI prepares a summary for the recruiter. A recruiter reviews it and makes every decision.',
      },
      {
        title: 'Your data is protected',
        body: 'It’s kept for a limited time and then deleted. You can ask your recruiter to delete it at any time.',
      },
    ],
    tipsTitle: 'A few tips',
    tips: [
      'Find a quiet place — headphones help a lot.',
      'Speak as you would with a real client. There are no trick questions.',
      'It’s fine to ask the client to repeat or clarify.',
    ],
    checkbox:
      'I understand that I will talk to an AI and that the conversation is recorded and transcribed. I agree to take part.',
    continue: 'Continue',
  },

  mic: {
    title: 'Let’s check your microphone',
    body: 'Your browser will ask for permission to use the microphone. Allow it, then say a few words.',
    allow: 'Allow microphone',
    speakNow: 'Say something, for example “Hello, can you hear me?”',
    detected: 'Great — we can hear you clearly.',
    notDetected:
      'We can’t hear you yet. Check that the right microphone is selected in your system settings and that it isn’t muted.',
    headphones: 'Tip: use headphones so the AI doesn’t hear itself.',
    level: 'Microphone level',
    start: 'Start the conversation',
    startHint: 'The client will greet you first. The timer starts now.',
    resumeTitle: 'Welcome back',
    resumeBody:
      'Your conversation was interrupted. Check your microphone, then continue where you left off — the timer kept running while you were away.',
    resume: 'Continue the conversation',
    errors: {
      denied: {
        title: 'Microphone access is blocked',
        body: 'Click the lock or microphone icon in the address bar, set Microphone to “Allow”, then click “Try again”.',
      },
      notFound: {
        title: 'No microphone found',
        body: 'Connect a microphone or headset, then click “Try again”.',
      },
      busy: {
        title: 'Your microphone is busy',
        body: 'Another app (for example Teams or Zoom) may be using it. Close that app, then click “Try again”.',
      },
      generic: {
        title: 'We couldn’t start your microphone',
        body: 'Please reload the page and try again. If it keeps happening, try a different browser.',
      },
    },
  },

  /** Candidate-friendly names of the conversation parts (by template phase id). */
  phases: {
    'warm-up': 'Introductions',
    'project-deep-dive': 'Your recent project',
    'client-situation': 'A client situation',
    closing: 'Wrap-up',
  } as Record<string, string>,

  live: {
    connecting: 'Connecting you to the client…',
    reconnecting: 'Reconnecting…',
    aiSpeaking: 'The client is speaking',
    youSpeaking: 'You’re speaking',
    listening: 'Listening…',
    thinking: 'Thinking…',
    clientSpeaking: 'Speaking',
    progress: 'Conversation progress',
    hint: 'Speak naturally. Take a moment to think if you need to.',
    timeLeft: 'left',
    end: 'End conversation',
    endTitle: 'End the conversation now?',
    endConfirm: 'You won’t be able to continue it later. Your answers so far will be saved.',
    endCancel: 'Keep talking',
    endAction: 'End conversation',
    finishing: 'Saving your conversation…',
    wrapUp: 'About a minute left — the client will wrap up.',
    dropped: {
      title: 'The connection dropped',
      body: 'No worries — your answers so far are saved. Check your internet connection and reconnect to continue where you stopped.',
      reconnect: 'Reconnect',
    },
    errors: {
      tooManyConnections:
        'The conversation was interrupted too many times and can’t be resumed. Please contact your recruiter.',
      unavailable:
        'The conversation service is temporarily unavailable. Please wait a moment and try again.',
      connectFailed:
        'We couldn’t connect the call. Check your internet connection (and any VPN or firewall), then try again.',
    },
    leaveWarning: 'Your conversation is still in progress. Are you sure you want to leave?',
  },

  ended: {
    title: 'Thank you — you’re done!',
    body: 'Your conversation is complete. Your recruiter will review it and get back to you about the next steps.',
    timeUp: 'The time for the conversation is up.',
    uploading: 'Saving the recording… please keep this page open for a moment.',
    uploaded: 'Everything is saved. You can close this page.',
    uploadFailed:
      'We couldn’t save the audio recording, but your transcript is saved. You can close this page.',
  },
} as const;
