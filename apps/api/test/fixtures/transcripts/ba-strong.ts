import { buildTurns, type TranscriptFixture } from './build';

/** Strong business analyst (B2+/C1): structures a vague request, clarifies, summarises, pushes back. */
export const baStrongCandidate: TranscriptFixture = {
  name: 'ba-strong',
  description: 'Mocny analityk B2+/C1 (niejasne wymaganie: dashboard)',
  templateId: 'business-analyst',
  targetLevel: 'B2',
  expected: { recommendation: 'READY', speaking: ['B2', 'C2'] },
  ...buildTurns([
    [
      'AI',
      "Hi Karolina, I'm Lukas Brenner, Head of Claims Operations at Veldmark Insurance. Could you tell me a bit about yourself and your recent work as an analyst?",
    ],
    [
      'C',
      "Hi Lukas, nice to meet you. I've been a business analyst for about five years, mostly in insurance and banking. For the last two years I worked on a claims modernisation programme for a Dutch insurer, where I was the analyst between the claims department, the IT team and an external vendor.",
      22,
    ],
    ['AI', 'Okay. What business problem did that programme solve?'],
    [
      'C',
      'The main problem was cycle time. A simple motor claim took on average eleven days, mostly because documents arrived by email and had to be matched manually. Customers called three or four times per claim, so the call centre was overloaded as well. The goal was to bring simple claims under five days and cut the calls in half.',
      25,
    ],
    ['AI', 'I see. Who were the main stakeholders?'],
    [
      'C',
      'The head of claims, who owned the budget, the team leaders of the claim handlers, the fraud team, and customer service. And IT security, which people tend to forget until the very end. I made a simple stakeholder map at the start, because the fraud team and customer service had quite different priorities.',
      22,
    ],
    ['AI', 'How did you find out what they really needed?'],
    [
      'C',
      'I started with the process, not with the system. I spent two days next to the claim handlers, watching how they actually worked, and I measured where the time went. Then I ran workshops with each group. What people said in the workshops and what I saw on the floor were not always the same, so I brought those differences back to them with examples.',
      27,
    ],
    ['AI', 'Tell me about a moment when two stakeholders wanted different things.'],
    [
      'C',
      'Fraud wanted a manual check on every claim above two thousand euros, and customer service wanted fast payouts. Instead of choosing a side, I pulled the data: only about three percent of claims above that amount were actually suspicious. So we proposed a risk score, with manual checks only for high scores. Both sides agreed, because it was based on their own numbers.',
      28,
    ],
    ['AI', 'How did you decide what went into the first release?'],
    [
      'C',
      "We looked at value against effort and at dependencies. Document intake had the biggest impact on cycle time and didn't depend on the fraud model, so it went first. I wrote user stories with clear acceptance criteria, and we agreed with the head of claims on one success metric for the release: time from first notice to complete file.",
      25,
    ],
    [
      'AI',
      "Okay. Let me ask about something that's on my desk right now. Our claim handlers are drowning. We need a dashboard so management can see what is going on. Can you write the requirements this week?",
    ],
    [
      'C',
      'I can start this week, yes. Before I write anything, could you tell me who will actually use the dashboard — the board, you, or the team leaders? And what decision should they be able to make after looking at it? A dashboard for weekly steering looks very different from one for daily workload planning.',
      23,
    ],
    ['AI', 'Mostly me and the team leaders. We want to see where the backlog is.'],
    [
      'C',
      "Okay, so it's about managing workload. What do you consider backlog — claims waiting for documents, claims waiting for a handler, or both? And do you already have that data somewhere, or is part of it only in spreadsheets? That affects how quickly we can deliver something useful.",
      22,
    ],
    [
      'AI',
      "Some of it is in the claims system, some in Excel. Honestly, I don't have time for many meetings. Just write something sensible.",
    ],
    [
      'C',
      "I understand, and I'll keep your time to a minimum. Let me suggest this: I spend two hours with two team leaders to see how they track the backlog today, and then I send you a one-page draft with three or four key numbers and where each number comes from. You just review it. Without that, I would be guessing, and we might build a dashboard nobody uses.",
      27,
    ],
    ['AI', 'Fine. But I promised the board something by the end of the month.'],
    [
      'C',
      "Then let's split it. By the end of the month we can realistically show a first version with the numbers that already exist in the claims system, for example claims per status and age. The Excel-based numbers need a data decision first, so I'd put them in the second step and make that clear to the board. That way you have something reliable to show, and no surprises later.",
      28,
    ],
    ['AI', 'Okay, that works. What do you need from me to start?'],
    [
      'C',
      "Two things: the names of two team leaders I can sit with this week, and access to the claims system reports. I'll send you the one-page draft by Friday, and we can agree on it in fifteen minutes.",
      15,
    ],
    ['AI', "Sounds good. We're almost out of time — do you have a quick question for me?"],
    [
      'C',
      "Yes — who else will see the dashboard besides the board? If the team leaders' own performance becomes visible, I'd like to involve them early, so they see it as a tool and not as control.",
      14,
    ],
    [
      'AI',
      "Good point, we'll talk about it. Thanks, Karolina, it was a pleasure. Have a good day!",
    ],
    ['C', 'Thank you, Lukas. Have a great day.', 3],
  ]),
};
