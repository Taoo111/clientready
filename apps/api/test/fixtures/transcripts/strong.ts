import { buildTurns, type TranscriptFixture } from './build';

/** Strong candidate (B2+/C1): precise, structured, asks clarifying questions, pushes back diplomatically. */
export const strongCandidate: TranscriptFixture = {
  name: 'strong',
  description: 'Mocny kandydat B2+/C1',
  templateId: 'backend-developer',
  targetLevel: 'B2',
  expected: { recommendation: 'READY', speaking: ['B2', 'C2'] },
  ...buildTurns([
    [
      'AI',
      "Hi Marta, I'm Emma Visser, product owner at Northbeam Payments. We run a B2B payments platform and we're extending the team with external developers. Could you tell me a bit about yourself and what you've been working on recently?",
    ],
    [
      'C',
      "Hi Emma, nice to meet you. Sure. I'm a backend developer, mostly Java and Kotlin, with about six years of commercial experience. For the last two years I've been working for a logistics client in Germany, on their shipment tracking platform. My main focus there was the event-driven part: ingesting status updates from carriers, normalising them and exposing them through a public API that their customers integrate with.",
      28,
    ],
    [
      'AI',
      'Nice. Have you worked directly with clients or product owners, or mostly through a lead?',
    ],
    [
      'C',
      "Directly, most of the time. I joined their refinement sessions every sprint, and for a few features I was effectively the technical contact for their product manager — so I'd clarify requirements with her, propose options and then break the work down for the team.",
      17,
    ],
    [
      'AI',
      "Great. Let's go deeper into that tracking platform. What did the architecture look like, and which part did you own?",
    ],
    [
      'C',
      'At a high level we had around fifteen services on Kubernetes in AWS. Carrier updates came in through webhooks or, for older carriers, through SFTP files that we polled. Everything was published to Kafka, then a normalisation service mapped around forty different carrier formats into one internal event model. I owned that normalisation service and the public tracking API on top of it, which served roughly two thousand requests per second at peak.',
      32,
    ],
    ['AI', 'Why Kafka there? Couldn’t you just write the updates straight into the database?'],
    [
      'C',
      "We could have, and that was actually the original design. The problem was that carriers send updates in bursts — after a customs clearance you'd suddenly get fifty thousand events in a few minutes — and the database writes were blocking the API. Kafka gave us a buffer, and just as importantly, the ability to replay. When we found a bug in one carrier's mapping, we could fix it and reprocess the last week of events instead of asking the carrier to resend them. The trade-off is operational complexity: you need people who understand partitions, consumer lag, ordering. So it's not something I'd recommend for a small system.",
      42,
    ],
    ['AI', 'Makes sense. What was the hardest problem you had there?'],
    [
      'C',
      "Ordering, definitely. Events for one shipment could arrive out of order — 'delivered' before 'out for delivery', for example — and customers saw their parcel jump back and forth. We fixed it in two steps. First, we partitioned by shipment ID so events for one shipment always went to the same consumer. Second, because carriers' own timestamps weren't reliable, we introduced a simple state machine that rejects impossible transitions and parks suspicious events for a few minutes before applying them. Complaints about 'jumping' statuses dropped by about ninety percent.",
      38,
    ],
    [
      'AI',
      'And if you had to explain that fix to someone non-technical — say our CFO — how would you put it?',
    ],
    [
      'C',
      "I'd say: parcels were sometimes reported in the wrong order, like a letter being 'delivered' and then 'on its way'. We now check that every update makes sense given the previous one, and if it doesn't, we wait a moment for the missing piece before we show it to the customer.",
      18,
    ],
    ['AI', 'Nice. If you built it again, what would you do differently?'],
    [
      'C',
      "I'd invest in contract tests with the carriers much earlier. We spent a lot of time on firefighting because a carrier silently changed a field format. And I'd probably keep fewer services — some of them were split too early and it made local development painful.",
      19,
    ],
    [
      'AI',
      'Okay, let me bring you into a real situation. We need merchants to get paid out faster. Can you build that for the next release?',
    ],
    [
      'C',
      "I'd be happy to look at it, but before I commit to anything I need to understand what 'faster' means for you. What's the current payout time, and what's the target — same day, or instant? And is this for all merchants and all countries, or for a specific segment?",
      19,
    ],
    [
      'AI',
      "Right now it's T plus two. Sales promised some bigger merchants same-day payouts. Mostly the Netherlands and Germany.",
    ],
    [
      'C',
      "Okay, that helps. Same-day in the Netherlands and Germany is realistic with SEPA Instant, but it has two implications I'd like to flag. One is risk: if we pay out before the card transactions are fully settled, we're effectively pre-financing the merchant, so risk and finance need to agree on limits. The other is the bank side — do we already have SEPA Instant enabled with our payout bank? If not, that's usually the long pole, not the code.",
      34,
    ],
    [
      'AI',
      'Honestly, I just need it done. Your team estimated three weeks for a first version. Our previous vendor said it would take a few days. Why so long?',
    ],
    [
      'C',
      "I understand the pressure, and I don't want to hide behind process. A few days is realistic for the happy path — calling the instant payout API. The three weeks cover what goes wrong in production: payouts that fail or time out, reconciliation with the bank statements, limits per merchant and an audit trail, because this is money leaving our account. If you'd like, we can split it: a pilot for two or three trusted merchants in about a week with manual reconciliation, and the full version afterwards. That way sales can keep their promise without us taking the full risk.",
      38,
    ],
    ['AI', 'Hmm. And what do you need from me to start?'],
    [
      'C',
      'Three things: the list of pilot merchants, a named person from risk who can sign off the limits, and confirmation from treasury about SEPA Instant with our bank. If I get those by Wednesday, I can come back on Friday with a concrete plan and a date for the pilot.',
      18,
    ],
    ['AI', "That's fair. We're almost out of time — do you have a quick question for me?"],
    [
      'C',
      'Just one: how are decisions made between product and risk today — is there a regular forum, or is it case by case? It affects how quickly we can move on features like this.',
      12,
    ],
    [
      'AI',
      "There's a weekly risk review, and I can bring you in. Thanks, Marta, it was a pleasure. Have a good day!",
    ],
    ['C', 'Thank you, Emma, likewise. Have a great day.', 3],
  ]),
};
