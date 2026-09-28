import { buildTurns, type TranscriptFixture } from './build';

/**
 * Medium business analyst (B1/B2): describes own work reasonably, with errors; with
 * conflicting stakeholders asks one basic question, then mostly agrees with the client.
 */
export const baMediumCandidate: TranscriptFixture = {
  name: 'ba-medium',
  description: 'Średni analityk B1/B2, problemy przy sprzecznych wymaganiach',
  templateId: 'business-analyst',
  targetLevel: 'B2',
  expected: { recommendation: 'READY_WITH_CONCERNS', speaking: ['B1', 'B2'] },
  ...buildTurns([
    [
      'AI',
      "Hi Marek, I'm Lukas Brenner, Head of Claims Operations at Veldmark Insurance. Could you tell me a bit about yourself and your recent work as an analyst?",
    ],
    [
      'C',
      'Hello Lukas. So, I am business analyst since three years. I work in a company which make software for banks. Last project was a system for the loans, when customer apply for a loan online and then the bank employee check it.',
      24,
    ],
    ['AI', 'Okay. How much did you work directly with business stakeholders?'],
    [
      'C',
      'Quite a lot. I was on meetings with the bank people, mostly with the product owner from the bank and sometimes with the employees who use the system. I was writing the notes and then the requirements for our developers.',
      19,
    ],
    ['AI', 'I see. How did you find out what they really needed?'],
    [
      'C',
      'We had workshops with them, maybe five or six. I asked them how they work now and what is the problem. Also I looked at the old system and the documents they use. Then I wrote user stories in Jira and the product owner accepted them.',
      22,
    ],
    ['AI', 'How did you document the requirements?'],
    [
      'C',
      'Mostly user stories in Jira, with acceptance criteria. For bigger things I made a document in Confluence with the process diagram, because the bank people liked to see the whole flow and not only the stories.',
      19,
    ],
    ['AI', 'Why did the bank people prefer the whole flow?'],
    [
      'C',
      "Because they don't think in stories, they think in their process, like step by step what the employee is doing. When they see the diagram, they can say quickly if something is wrong or missing.",
      18,
    ],
    ['AI', 'Can you give me an example of something they found that way?'],
    [
      'C',
      'Yes, one time they saw that we forgot the step when the customer must sign the agreement again, if the amount is changed. It was not in the stories, so we added it before the development.',
      18,
    ],
    ['AI', 'Tell me about a moment when two stakeholders wanted different things.'],
    [
      'C',
      'Yes, there was a situation. The risk department wanted more checks for every loan, and the sales wanted that the process is fast. It was difficult. Finally the product owner decided, and we added the checks only for bigger loans.',
      20,
    ],
    ['AI', 'What was your role in that decision?'],
    [
      'C',
      'I prepared the information for the meeting, like how many loans are big and how long the checks take. But the decision was from the product owner, I just wrote it down after.',
      15,
    ],
    ['AI', 'How did you decide what went into the first release?'],
    [
      'C',
      'The product owner made the priority list. I helped with the information, like which features are needed for the law and which are only nice to have. The law things were first.',
      16,
    ],
    ['AI', 'How did you know the solution actually worked for the users?'],
    [
      'C',
      "After the release we asked the users in a short survey. Most of them said it is better. We also saw that less loans were waiting in the queue, but I don't remember exact numbers.",
      17,
    ],
    [
      'AI',
      "Okay. Something that's on my desk right now: our fraud team wants every claim above five thousand euros checked manually, but customer service wants all claims paid within forty-eight hours. Just make both happen.",
    ],
    ['C', 'Okay. How many claims are above five thousand euros in a month?', 7],
    ['AI', "I don't know exactly. Quite a lot, maybe a few hundred."],
    [
      'C',
      'Okay, then maybe we can add more people to the fraud team, so they can check faster. Then both is possible.',
      11,
    ],
    ['AI', "We don't have budget for more people. Can't you just make the system faster?"],
    [
      'C',
      'Hmm, yes, we can try to make it faster. Maybe we can automate some part of the checks. I think it is possible, I will talk with the developers.',
      14,
    ],
    ['AI', 'And what do I tell the fraud team if some checks are automated?'],
    [
      'C',
      'You can tell them that the important claims will be still checked. Maybe the fraud team can decide which rules are used. I can write the requirements for this.',
      15,
    ],
    ['AI', 'Okay. What are the next steps then?'],
    [
      'C',
      'I will write the requirements and send to you. Then we can have a meeting with fraud team and customer service and they can check it.',
      12,
    ],
    ['AI', "Alright. We're almost out of time — do you have a quick question for me?"],
    ['C', 'Yes, how big is the team where I will work?', 5],
    [
      'AI',
      'About eight people, analysts and developers together. Thanks, Marek — have a good day!',
    ],
    ['C', 'Thank you, bye.', 2],
  ]),
};
