import { buildTurns, type TranscriptFixture } from './build';

/**
 * Weak candidate (A2/B1): short, broken answers, frequent misunderstandings and requests
 * to repeat, cannot explain reasons, capitulates under pushback, one switch to Polish.
 */
export const weakCandidate: TranscriptFixture = {
  name: 'weak',
  description: 'Słaby kandydat A2/B1',
  targetLevel: 'B2',
  expected: { recommendation: 'NOT_READY', speaking: ['A1', 'B1'] },
  ...buildTurns([
    [
      'AI',
      "Hi Piotr, I'm Emma Visser, product owner at Northbeam Payments. We run a B2B payments platform and we're extending the team with external developers. Could you tell me a bit about yourself and what you've been working on recently?",
    ],
    [
      'C',
      'Hello. Yes. I am Piotr, I am developer. Java. I work... three years. In company in Wrocław, we make application for, eee, for bank. Internal application.',
      30,
    ],
    [
      'AI',
      'Nice. Have you worked directly with clients or product owners, or mostly through a lead?',
    ],
    ['C', 'Sorry, can you repeat? Directly with...?', 6],
    ['AI', 'Did you talk to the client yourself, or did your team lead talk to them?'],
    ['C', 'Ah. No, team lead. I do the tasks from Jira.', 7],
    [
      'AI',
      "Okay. Let's talk about that bank application. What did it do, and what did the architecture look like?",
    ],
    [
      'C',
      "It is application for, eee, the workers in bank. They see the clients and the credits. Architecture is... backend in Java, Spring, and database Oracle. And frontend Angular but I don't do frontend.",
      32,
    ],
    ['AI', 'Which part did you build yourself?'],
    ['C', 'I make the endpoints. For the credits. And I fix the bugs. Many bugs.', 11],
    ['AI', 'Why was it built with Oracle and not, say, PostgreSQL? Was that your decision?'],
    ['C', "No, no. It was before. Bank have Oracle, so... we use Oracle. I don't know why.", 11],
    ['AI', 'What was the hardest technical problem you had there?'],
    [
      'C',
      'Hardest... one time the query was very slow. Very slow, like one minute. And I... I make index. And after it was fast.',
      22,
    ],
    ['AI', 'How did you find out which query was slow and why?'],
    ['C', 'Eee... my colleague show me. In the logs. Then I make the index.', 10],
    ['AI', 'If you had to explain that fix to someone non-technical, how would you say it?'],
    ['C', 'Hmm. The database was slow and now is fast. Because index.', 9],
    [
      'AI',
      'Okay, let me bring you into a real situation. We need merchants to get paid out faster. Can you build that for the next release?',
    ],
    ['C', 'Yes. Yes, I can do it.', 4],
    [
      'AI',
      'Right now payouts take two days. Some big merchants were promised same-day payouts. What would you need to know?',
    ],
    ['C', "Sorry, I don't understand the question. What I need to... know?", 8],
    [
      'AI',
      "Before you start building, is there anything you'd want to ask me about the requirement?",
    ],
    ['C', 'Ah, no. I think is okay. I start and we will see.', 7],
    [
      'AI',
      'Honestly, I just need it done. Your team estimated three weeks. Our previous vendor said a few days. Why so long?',
    ],
    [
      'C',
      "Eee... nie wiem, to estymował team lead. Sorry. I don't know. Maybe we can do faster. Okay, few days is okay.",
      14,
    ],
    [
      'AI',
      "Let's continue in English. So can you tell me what risks you see if we do it in a few days?",
    ],
    ['C', "Risks... maybe bugs. I don't know. We will test.", 8],
    ['AI', 'What happens if a payout fails? For example the bank rejects it.'],
    ['C', 'Then... error. We show error. And the merchant, eee, he try again.', 10],
    ['AI', 'How do you usually test your code before it goes to production?'],
    [
      'C',
      'I write unit tests. JUnit. And the tester in team, she test also. Sometimes we have bugs on production but we fix fast.',
      18,
    ],
    ['AI', 'Okay. And what would you need from me to start the work?'],
    ['C', 'The task in Jira. With the description.', 5],
    ['AI', 'Alright, we are almost out of time. Do you have any question for me?'],
    ['C', 'No. Thank you.', 2],
    ['AI', 'Thanks, Piotr. Have a good day!'],
    ['C', 'Thank you. Bye bye.', 2],
  ]),
};
