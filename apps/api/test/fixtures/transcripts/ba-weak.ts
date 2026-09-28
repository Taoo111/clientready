import { buildTurns, type TranscriptFixture } from './build';

/**
 * Weak business analyst (A2/B1): very short answers, misunderstands questions, accepts
 * extra scope without any question, one sentence in Polish.
 */
export const baWeakCandidate: TranscriptFixture = {
  name: 'ba-weak',
  description: 'Słaby analityk A2/B1 (presja zakresu)',
  templateId: 'business-analyst',
  targetLevel: 'B2',
  expected: { recommendation: 'NOT_READY', speaking: ['A1', 'B1'] },
  ...buildTurns([
    [
      'AI',
      "Hi Tomek, I'm Lukas Brenner, Head of Claims Operations at Veldmark Insurance. Could you tell me a bit about yourself and your recent work as an analyst?",
    ],
    [
      'C',
      'Hello. I am Tomek. I am analyst, eee, two years. I work in company for insurance. I write the documentation.',
      22,
    ],
    ['AI', 'What kind of documentation did you write?'],
    [
      'C',
      'Documentation for the system. Requirements. In Word and in Jira. And diagrams, sometimes.',
      14,
    ],
    ['AI', 'How much did you work directly with business stakeholders?'],
    ['C', 'Sorry, can you repeat? Business...?', 6],
    ['AI', 'Did you talk to the business people yourself, or did someone else do that?'],
    ['C', 'Ah. My manager talk with them. Then he tell me and I write.', 10],
    ['AI', 'Okay. What business problem did your last project solve?'],
    [
      'C',
      'Problem... the system was old. Very old. So we make new system. For the claims. It is better now, more fast.',
      18,
    ],
    ['AI', 'How did you know it was better for the users?'],
    ['C', 'Eee... users say it is okay. Nobody complain. I think it is good.', 11],
    ['AI', 'Tell me about a moment when two people wanted different things.'],
    ['C', "Different things... I don't remember. Maybe yes, but manager decide. I don't know.", 12],
    ['AI', 'Which diagrams did you draw?'],
    [
      'C',
      'Diagrams... for the process. In Visio. The steps, eee, what the user do. Sometimes the manager say it is wrong and I change.',
      18,
    ],
    ['AI', 'Who used your requirements in the end?'],
    [
      'C',
      'The developers. And the tester. They read in Jira. Sometimes they ask me, and I ask manager.',
      14,
    ],
    ['AI', 'What did you do when the developers asked something you did not know?'],
    [
      'C',
      'I ask manager. Or I write email to the business. Sometimes answer is late, one week. Then developers wait.',
      16,
    ],
    ['AI', 'How did you decide what went into the first release?'],
    ['C', 'The manager decide. And the developers. I write what they say.', 10],
    [
      'AI',
      "Okay. Something that's on my desk right now: legal just told me we also need an audit trail and customer notifications in the first release. The go-live date stays the same, of course.",
    ],
    ['C', 'Okay. Yes. We can do it.', 5],
    ['AI', 'Really? The team said the plan was already full. How?'],
    [
      'C',
      'Eee... we work more. Maybe weekend. It is okay, I write the requirements for the audit and the notifications.',
      15,
    ],
    ['AI', 'What will you need from me for those requirements?'],
    ['C', 'Nie wiem, co jeszcze będzie potrzebne. Sorry. Maybe... the document from legal.', 10],
    ['AI', "Let's continue in English. What happens if the go-live is late?"],
    ['C', 'Late... it is not good. The users wait. But we try, we work hard.', 11],
    ['AI', 'And what should I tell legal?'],
    ['C', 'You tell them okay. We do everything. No problem.', 7],
    ['AI', 'How do you usually check that requirements are complete?'],
    [
      'C',
      'I ask the manager. And the tester check later. If something is missing, we fix it in next sprint.',
      16,
    ],
    ['AI', 'What would you do first tomorrow on this project?'],
    [
      'C',
      'Tomorrow... I read the document from legal. Then I write in Jira the tasks. Then I ask manager.',
      16,
    ],
    ['AI', "Alright, we're almost out of time. Do you have a question for me?"],
    ['C', 'No. Thank you.', 2],
    ['AI', 'Thanks, Tomek. Have a good day!'],
    ['C', 'Thank you. Bye.', 2],
  ]),
};
