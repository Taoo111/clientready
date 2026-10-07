import { buildTurns, type TranscriptFixture } from './build';

/**
 * Fluent, native-like speaker (lives in the UK) with thin content: effortless idiomatic
 * English with the fillers and self-corrections of natural speech, but generic answers, no
 * concrete example, no clarifying question of their own and an easy concession under pushback.
 * Guards the language level against the content (a real report gave such a speaker B1/B1).
 */
export const baFluentVagueCandidate: TranscriptFixture = {
  name: 'ba-fluent-vague',
  description: 'Płynny, naturalny angielski (C1+), ale ogólnikowe odpowiedzi',
  templateId: 'business-analyst',
  targetLevel: 'C1',
  expected: {
    recommendation: 'READY_WITH_CONCERNS',
    speaking: ['C1', 'C2'],
    listening: ['C1', 'C2'],
  },
  ...buildTurns([
    [
      'AI',
      "Hi Tom, I'm Lukas Brenner, Head of Claims Operations at Veldmark Insurance in Rotterdam. We're modernising our claims handling and I'm looking for someone to help us shape it with an external team. How's your day going so far?",
    ],
    [
      'C',
      "Hi Lukas, nice to meet you. Yeah, not bad at all, thanks. It's been one of those slow-starting Mondays, to be honest, but I'm getting there. How about yourself?",
      9,
    ],
    ['AI', 'Busy, in a good way. Could you tell me a bit about your recent work as an analyst?'],
    [
      'C',
      "Sure. So I've been doing BA work for, gosh, the best part of eight years now, mostly for a software house. At the moment I'm kind of wearing two hats, analyst and a bit of product owner, so a lot of my day is, you know, backlog stuff, sitting in on calls and making sure the devs know what they're actually building.",
      19,
    ],
    ['AI', 'Two hats, that sounds busy. Who do you work with most closely?'],
    [
      'C',
      'Mainly the product team, so a couple of UX people, and then the developers on both ends, backend and frontend. I sort of sit in the middle and keep everyone talking to each other, really.',
      12,
    ],
    ['AI', "Okay. Pick one recent project you're proud of. What business problem did it solve?"],
    [
      'C',
      "Right, so the main one at the moment is a cost-reduction thing for a logistics client. Basically they wanted to see where the money was going, so the big piece of work was an audit of their, sorry, of their processes, and then we built them a tool on top of that. It's gone down pretty well, I think.",
      19,
    ],
    ['AI', 'What did the audit actually change for them?'],
    [
      'C',
      "Well, it gave them visibility, mainly. Before that it was all a bit of a black box, and afterwards they could see where things were dragging. We didn't make the decisions for them, obviously, that's their call, but we gave them something to work with.",
      16,
    ],
    ['AI', 'Who did you talk to to understand the problem, and what did they tell you?'],
    [
      'C',
      "Mostly the client, so their operations lead. They'd explain what they needed, we'd come back with something, and if we'd got the wrong end of the stick they'd tell us and we'd go round again. That's pretty much how it works, to be fair.",
      15,
    ],
    ['AI', "Can you give me one concrete moment when they told you you'd got it wrong?"],
    [
      'C',
      "Uh, off the top of my head... there were a few, honestly. I mean, it happens on every project, doesn't it? Requirements shift, people change their minds, so you just roll with it and adjust.",
      13,
    ],
    ['AI', 'How did you document the requirements?'],
    [
      'C',
      "Jira mostly, user stories with acceptance criteria, and the odd Confluence page when something needed a bit more context. Nothing fancy, to be honest, just whatever the team's comfortable with.",
      12,
    ],
    ['AI', 'Tell me about a moment when two stakeholders wanted different things.'],
    [
      'C',
      "Oh, that happens all the time. Usually it's sales wanting one thing and operations wanting another, and you just have to get them in a room and hash it out. Normally someone senior makes the call in the end and we go with that.",
      15,
    ],
    ['AI', 'How did you know the solution actually worked for the users?'],
    [
      'C',
      "Honestly, mostly from the feedback. If people stop moaning, you know you're onto something, right? We had a couple of check-ins after go-live and the client seemed happy enough, so we took that as a win.",
      13,
    ],
    [
      'AI',
      "Fair enough. Let me bring it to my world. Our claim handlers are drowning, and management wants a dashboard to see what's going on. They want the requirements written this week.",
    ],
    ['C', "Sorry, I didn't quite catch the last bit. This week, was it?", 4],
    ['AI', 'Yes, this week. Management wants the dashboard requirements by Friday.'],
    [
      'C',
      "Okay, Friday's a bit tight, but let's see. I'd start by getting to the bottom of what the actual problem is before writing anything down. So I'd have a chat with the people who'll be using it and take it from there.",
      15,
    ],
    ['AI', "That makes sense, but it's still a bit broad. Who would you talk to first?"],
    [
      'C',
      "The claim handlers, I think, because they're the ones actually doing the work, so they'd know where it hurts. With management's blessing, obviously.",
      9,
    ],
    [
      'AI',
      'Management expects numbers, not just stories. What is your next step after those talks?',
    ],
    [
      'C',
      "Then I'd go back to the team, have a look at what's feasible with the developers and put together something sensible we could build.",
      9,
    ],
    [
      'AI',
      'Hm, going to the developers before we agree on it with management worries me. We could build something nice that misses the point.',
    ],
    [
      'C',
      "Yeah, no, that's a fair point, I skipped a step there. I'd play back what we heard to management first, make sure we're all on the same page, and only then take it to the devs.",
      13,
    ],
    ['AI', 'Okay. And what would you need from me to get started?'],
    [
      'C',
      "Just access to the right people really, and maybe whatever reports you've got at the moment. I'll pencil in some time with them this week and we'll take it from there.",
      11,
    ],
    [
      'AI',
      "We're nearly out of time. Do you have a quick question for me about the project or the team?",
    ],
    [
      'C',
      "Yeah, just out of curiosity, where's the project heading over the next six months or so?",
      5,
    ],
    [
      'AI',
      'Stabilising the core claims flow first, then reporting. Thanks for the chat today, Tom. The recruiter will be in touch.',
    ],
    ['C', 'Brilliant, thanks very much, Lukas. Take care.', 3],
  ]),
};
