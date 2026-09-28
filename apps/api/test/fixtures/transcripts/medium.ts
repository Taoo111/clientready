import { buildTurns, type TranscriptFixture } from './build';

/**
 * Medium candidate (B1/B2): talks about own project reasonably, with errors and limited
 * range; under pressure gives in, asks no clarifying questions and stays vague.
 */
export const mediumCandidate: TranscriptFixture = {
  name: 'medium',
  description: 'Średni kandydat B1/B2, problemy pod presją',
  templateId: 'backend-developer',
  targetLevel: 'B2',
  expected: { recommendation: 'READY_WITH_CONCERNS', speaking: ['B1', 'B2'] },
  ...buildTurns([
    [
      'AI',
      "Hi Tomasz, I'm Emma Visser, product owner at Northbeam Payments. We run a B2B payments platform and we're extending the team with external developers. Could you tell me a bit about yourself and what you've been working on recently?",
    ],
    [
      'C',
      'Hello Emma. So, I am backend developer, I work with Java and Spring since four years. Last project was for insurance company, we were making system for the claims, so when client have some accident he can report it online and then the system is calculating and sending to the agent.',
      26,
    ],
    [
      'AI',
      'Nice. Have you worked directly with clients or product owners, or mostly through a lead?',
    ],
    [
      'C',
      'Mostly through my team leader. Sometimes I was on the meeting with the client, but usually the team leader was talking and I was listening and later we discussed in the team.',
      16,
    ],
    [
      'AI',
      "Okay. Let's go deeper into that claims system. What did the architecture look like, and which part did you own?",
    ],
    [
      'C',
      'It was microservices, I think around eight services. We had Spring Boot, PostgreSQL database and RabbitMQ for the messages. I was responsible mostly for the service for documents — when client upload the photos and the PDF, we are storing it in S3 and then another service is checking it. Also I made some REST endpoints for the frontend.',
      30,
    ],
    ['AI', 'Why RabbitMQ there? Why not just call the other service directly?'],
    [
      'C',
      "Hmm, because... the checking of documents is taking long time, sometimes one minute, so we don't want that the user is waiting. So we send message and the other service is doing it in background. Also the architect decided it before I came to the project, so I didn't choose it myself.",
      24,
    ],
    ['AI', 'What was the hardest technical problem you had there?'],
    [
      'C',
      "The hardest was the performance of upload. When many users upload big photos in the same time, the service was very slow and sometimes out of memory. We changed that the file is going directly to S3 with presigned URL, not through our service. After this it was much better, I don't remember exactly the numbers but it was big difference.",
      29,
    ],
    ['AI', 'Good. How would you explain that change to someone non-technical?'],
    [
      'C',
      'I would say... before, all the photos was going through our server and it was too much for him. Now the photos go directly to the storage, so our server has less work.',
      15,
    ],
    ['AI', 'If you built it again, what would you do differently?'],
    [
      'C',
      'Maybe more tests. We had not so many integration tests and sometimes there was bugs on production.',
      9,
    ],
    [
      'AI',
      'Okay, let me bring you into a real situation. We need merchants to get paid out faster. Can you build that for the next release?',
    ],
    [
      'C',
      "I think it's possible, but what is the time now for the payout? And it is for all merchants or only some?",
      11,
    ],
    ['AI', "Right now it's T plus two. Sales promised some bigger merchants same-day payouts."],
    [
      'C',
      "Okay, so same day, for the big merchants. I think we need to change the job which is doing the payouts, so it's running more often. It should be okay for next release.",
      15,
    ],
    [
      'AI',
      'Honestly, I just need it done. Your team estimated three weeks for a first version. Our previous vendor said it would take a few days. Why so long?',
    ],
    [
      'C',
      "Hmm, three weeks is because we need to change the payout job, and also handle the errors and test it with the bank. A few days is maybe only for the simple part. But okay, if it's very important for you, maybe we can try faster, like two weeks.",
      22,
    ],
    ['AI', "But why did the team say three weeks in the first place? What's in there?"],
    [
      'C',
      "There is the implementation, the testing, and some things with the bank connection. I'm not sure about all details, I need to ask my team leader about this.",
      14,
    ],
    ['AI', 'What would you need from me to start?'],
    [
      'C',
      'Hmm, maybe the documentation of the current payout process. And access to the system.',
      8,
    ],
    ['AI', 'Okay. And what if payouts fail during the day — what happens to the merchant?'],
    ['C', 'Sorry, can you repeat? What happens when...?', 4],
    ['AI', "If an instant payout fails, what happens to the merchant's money?"],
    [
      'C',
      'Ah, okay. Then we should retry it, I think. And maybe send some notification. We can add logs so we can check what happened.',
      12,
    ],
    ['AI', "Alright, we're almost out of time. Do you have a question for me?"],
    ['C', 'No, I think everything is clear. Thank you.', 4],
    ['AI', 'Thanks, Tomasz. Have a good day!'],
    ['C', 'Thank you, bye.', 2],
  ]),
};
