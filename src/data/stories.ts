export interface StoryStep {
  // Must correspond to a real node id in the dataset.
  nodeId: string;
  // Hand-written narrative prose for this step, in story voice rather
  // than the drier encyclopedia tone of the node's own description field.
  // Supports an inline link syntax: [[nodeId|Display Text]] renders as a
  // clickable link that jumps to Explore with that node selected. The
  // nodeId doesn't need to be one of this story's own steps — it can
  // reference any node in the dataset.
  narrative: string;
}

export interface Story {
  id: string;
  title: string;
  // One-liner shown on the story's card in the list view.
  teaser: string;
  // Ordered; every consecutive pair of nodeIds must have a real edge
  // between them (in either direction) somewhere in the dataset — stories
  // are curated routes through real connections, not fabricated ones.
  steps: StoryStep[];
}

export const STORIES: Story[] = [
  {
    id: "aristotle-to-the-big-bang",
    title: "Aristotle to the Big Bang",
    teaser:
      "A single unbroken chain of influence connects the ancient Greek philosopher who first systematized the cosmos to the discovery of how it all began, twenty-three centuries later.",
    steps: [
      {
        nodeId: "aristotle",
        narrative:
          "Our story begins in ancient Greece, with a philosopher who insisted the universe could be understood through careful, systematic observation. [[aristotle|Aristotle]]'s model of the cosmos — Earth fixed at the center, the heavens turning in perfect circles around it — would dominate Western astronomy for the better part of two thousand years.",
      },
      {
        nodeId: "ptolemy",
        narrative:
          "Four centuries later in Roman Egypt, Claudius Ptolemy inherited Aristotle's geocentric universe and did something remarkable: he made it mathematically predictive. Using an intricate system of circles within circles, he could forecast where any planet would appear in the night sky, years in advance.",
      },
      {
        nodeId: "ptolemaic-system",
        narrative:
          "That system — the Ptolemaic model — became the definitive statement of geocentric astronomy, so thoroughly authoritative that questioning it seemed almost unthinkable. It would rule unchallenged for fourteen centuries.",
      },
      {
        nodeId: "copernicus",
        narrative:
          "Unthinkable, until a Polish astronomer named Nicolaus Copernicus asked a heretical question: what if the Sun, not the Earth, sat at the center? His heliocentric model didn't just rearrange the furniture of the cosmos — it cracked open a worldview that had held for a millennium and a half, and set the Scientific Revolution in motion.",
      },
      {
        nodeId: "kepler",
        narrative:
          "Johannes Kepler picked up where Copernicus left off, armed with the most precise astronomical measurements ever collected. Rather than force the data to fit tidy circles, Kepler let the numbers speak for themselves — and they told him planets move in ellipses.",
      },
      {
        nodeId: "laws-of-planetary-motion",
        narrative:
          "The three laws Kepler distilled from that data — elliptical orbits, equal areas in equal times, and a precise relationship between orbital period and distance — weren't a theory he invented. They were a pattern he found, hiding in plain sight in the numbers all along.",
      },
      {
        nodeId: "newton",
        narrative:
          "Decades later, Isaac Newton asked why Kepler's laws were true. His answer — a universal force of gravitation, pulling every mass toward every other mass — didn't just explain planetary orbits. It unified the heavens and the Earth under one set of mathematical laws for the first time in human history.",
      },
      {
        nodeId: "maxwell",
        narrative:
          "Two centuries after Newton, James Clerk Maxwell turned his attention to a very different phenomenon: electricity and magnetism. His equations revealed that light itself is an electromagnetic wave — and, buried in the mathematics, a subtle tension with Newton's picture of absolute space and time.",
      },
      {
        nodeId: "einstein",
        narrative:
          "That tension is exactly what a young patent clerk named Albert Einstein set out to resolve. In reconciling Maxwell's electrodynamics with the laws of motion, he arrived at special relativity — and a decade later, at a far more radical idea about gravity itself.",
      },
      {
        nodeId: "general-relativity",
        narrative:
          "General relativity replaced Newton's invisible force of gravity with something stranger and more beautiful: mass and energy curving the fabric of spacetime, and objects simply following the straightest possible path through that curve. It was a theory about geometry — but tucked inside its equations was an implication Einstein himself initially resisted.",
      },
      {
        nodeId: "friedmann-equations",
        narrative:
          "That implication was uncovered by a Russian mathematician named Alexander Friedmann. When he applied Einstein's own equations to the universe as a whole, they refused to describe a static, unchanging cosmos — they described a universe that must be either expanding or contracting. Einstein was so uncomfortable with the result that he initially dismissed it as a mathematical error. Friedmann died of typhoid fever at 37, before he lived to see himself proven right.",
      },
      {
        nodeId: "georges-lemaitre",
        narrative:
          "A Belgian priest and physicist named Georges Lemaître picked up the thread. If the universe truly is expanding, he reasoned, then running the clock backward should lead to a moment when all matter, all space, and all time were compressed into a single point. He called it the \"primeval atom.\" Einstein, upon hearing the idea, reportedly told him: \"Your math is correct, but your physics is abominable.\" Time would prove otherwise.",
      },
      {
        nodeId: "big-bang-theory",
        narrative:
          "Lemaître's primeval atom is what we now call the Big Bang — and it didn't stay a mathematical curiosity for long. Edwin Hubble found galaxies rushing away from us, exactly as an expanding universe predicted. George Gamow calculated that the newborn universe should have left behind a faint afterglow of radiation. And in 1965, two radio astronomers named Arno Penzias and Robert Wilson found that exact afterglow — by accident, while trying to track down an annoying hiss in their antenna they'd first blamed on pigeon droppings. Twenty-three centuries after Aristotle first insisted the cosmos was orderly enough to understand, we found its birth cry, still echoing across the sky.",
      },
    ],
  },
];
