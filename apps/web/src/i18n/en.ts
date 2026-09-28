/** Candidate-facing strings (English). */
export const en = {
  appName: 'ClientReady',
  tagline: 'Can you handle a real conversation with a client in English?',

  loading: 'Loading…',
  retry: 'Try again',

  errors: {
    notFound: {
      title: 'This link is not valid',
      body: 'Please check that you opened the full link from your invitation, or contact your recruiter.',
    },
    expired: {
      title: 'This link has expired',
      body: 'Please contact your recruiter to get a new link.',
    },
    alreadyCompleted: {
      title: 'This conversation is already completed',
      body: 'Thank you — your conversation has already been recorded. There is nothing more to do.',
    },
    network: {
      title: 'Cannot reach the server',
      body: 'Please check your internet connection and try again.',
    },
    unsupported: {
      title: 'Your browser is not supported',
      body: 'Please open this link in a recent version of Chrome, Edge, Firefox or Safari on a computer.',
    },
  },

  consent: {
    title: (name: string) => `Hi ${name}, welcome!`,
    intro: (role: string) =>
      `This is a short English conversation for the ${role} role. It takes about 12 minutes.`,
    points: [
      'You will talk to an AI (artificial intelligence), not a human. The AI plays a client who asks about your work experience and discusses a typical project situation with you.',
      'The conversation is recorded (audio) and transcribed.',
      'The recording and the transcript are used to prepare an assessment of your spoken English in client conversations. The AI only prepares a recommendation — a recruiter reviews it and makes every decision.',
      'Your data is kept for a limited time and then deleted. You can ask your recruiter for details or to have your data removed.',
    ],
    tipsTitle: 'Before you start',
    tips: [
      'Find a quiet place and use headphones if you can.',
      'Speak as you would in a real call with a client. There are no trick questions.',
      'The conversation ends automatically after 12 minutes.',
    ],
    checkbox:
      'I understand that I will talk to an AI, that the conversation is recorded and transcribed, and I agree to this.',
    continue: 'Continue',
  },

  mic: {
    title: 'Microphone check',
    body: 'Your browser will ask for access to your microphone. Please allow it, then say a few words — the bar should move.',
    allow: 'Enable microphone',
    speakNow: 'Say something, for example: "Hello, can you hear me?"',
    detected: 'Great, we can hear you.',
    notDetected:
      'We cannot hear you yet. Check that the right microphone is selected and not muted.',
    headphones: 'Tip: headphones prevent echo and make the conversation smoother.',
    level: 'Microphone level',
    start: 'Start conversation',
    resumeTitle: 'Resume your conversation',
    resumeBody:
      'Your conversation was interrupted. You can continue where you left off — the timer kept running while you were away.',
    resume: 'Resume conversation',
    errors: {
      denied:
        'Microphone access was blocked. Click the lock or microphone icon in the address bar, allow the microphone for this site and try again.',
      notFound: 'No microphone was found. Please connect a microphone or headset and try again.',
      busy: 'Your microphone is being used by another application. Close other apps that use it (for example Teams or Zoom) and try again.',
      generic: 'We could not access your microphone. Please try again.',
    },
  },

  live: {
    connecting: 'Connecting to the client…',
    reconnecting: 'Reconnecting…',
    aiSpeaking: 'Client is speaking',
    youSpeaking: 'You are speaking',
    listening: 'Listening…',
    client: 'Client',
    you: 'You',
    timeLeft: 'Time left',
    end: 'End conversation',
    endConfirm:
      'Are you sure you want to end the conversation now? You will not be able to continue it later.',
    finishing: 'Ending the conversation…',
    dropped: {
      title: 'Connection lost',
      body: 'The connection was interrupted. Check your internet connection and reconnect — the conversation will continue where it stopped.',
      reconnect: 'Reconnect',
    },
    errors: {
      tooManyConnections:
        'The conversation was interrupted too many times and cannot be resumed. Please contact your recruiter.',
      unavailable:
        'The conversation service is temporarily unavailable. Please try again in a moment.',
      connectFailed: 'We could not connect the call. Please check your connection and try again.',
    },
    leaveWarning: 'Your conversation is still in progress. Are you sure you want to leave?',
  },

  ended: {
    title: 'Thank you!',
    body: 'Your conversation is complete. Your recruiter will get back to you with the next steps.',
    timeUp: 'The time for the conversation is up.',
    uploading: 'Saving the recording… please keep this page open.',
    uploaded: 'Everything is saved. You can close this page now.',
    uploadFailed:
      'We could not save the audio recording, but your transcript has been saved. You can close this page.',
  },
} as const;
