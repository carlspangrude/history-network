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
  // Shown as tags on the story's card — plain display labels, not tied
  // to the graph's own Discipline type, but chosen to match it for
  // consistency.
  disciplines: string[];
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
    disciplines: ["Physics", "Astronomy", "Mathematics"],
    steps: [
      {
        nodeId: "aristotle",
        narrative:
          "Our story begins in ancient Greece, with a philosopher who insisted the universe could be understood through careful, systematic observation. [[aristotle|Aristotle]]'s model of the cosmos — Earth fixed at the center, the heavens turning in perfect circles around it — would dominate Western astronomy for the better part of two thousand years.",
      },
      {
        nodeId: "ptolemy",
        narrative:
          "Four centuries later in Roman Egypt, [[ptolemy|Claudius Ptolemy]] inherited [[aristotle|Aristotle]]'s geocentric universe and did something remarkable: he made it mathematically predictive. Using an intricate system of circles within circles, he could forecast where any planet would appear in the night sky, years in advance.",
      },
      {
        nodeId: "ptolemaic-system",
        narrative:
          "That system — the [[ptolemaic-system|Ptolemaic model]] — became the definitive statement of geocentric astronomy, so thoroughly authoritative that questioning it seemed almost unthinkable. It would rule unchallenged for fourteen centuries.",
      },
      {
        nodeId: "copernicus",
        narrative:
          "Unthinkable, until a Polish astronomer named [[copernicus|Nicolaus Copernicus]] asked a heretical question: what if the Sun, not the Earth, sat at the center? His heliocentric model didn't just rearrange the furniture of the cosmos — it cracked open a worldview that had held for a millennium and a half, and set the Scientific Revolution in motion.",
      },
      {
        nodeId: "kepler",
        narrative:
          "[[kepler|Johannes Kepler]] picked up where [[copernicus|Copernicus]] left off, armed with the most precise astronomical measurements ever collected. Rather than force the data to fit tidy circles, Kepler let the numbers speak for themselves — and they told him planets move in ellipses.",
      },
      {
        nodeId: "laws-of-planetary-motion",
        narrative:
          "The three laws [[kepler|Kepler]] distilled from that data — elliptical orbits, equal areas in equal times, and a precise relationship between orbital period and distance — weren't a theory he invented. They were a pattern he found, hiding in plain sight in the numbers all along.",
      },
      {
        nodeId: "newton",
        narrative:
          "Decades later, [[newton|Isaac Newton]] asked why [[laws-of-planetary-motion|Kepler's laws]] were true. His answer — a universal force of gravitation, pulling every mass toward every other mass — didn't just explain planetary orbits. It unified the heavens and the Earth under one set of mathematical laws for the first time in human history.",
      },
      {
        nodeId: "maxwell",
        narrative:
          "Two centuries after [[newton|Newton]], [[maxwell|James Clerk Maxwell]] turned his attention to a very different phenomenon: electricity and magnetism. His equations revealed that light itself is an electromagnetic wave — and, buried in the mathematics, a subtle tension with Newton's picture of absolute space and time.",
      },
      {
        nodeId: "einstein",
        narrative:
          "That tension is exactly what a young patent clerk named [[einstein|Albert Einstein]] set out to resolve. In reconciling [[maxwell|Maxwell]]'s electrodynamics with the laws of motion, he arrived at special relativity — and a decade later, at a far more radical idea about gravity itself.",
      },
      {
        nodeId: "general-relativity",
        narrative:
          "[[general-relativity|General relativity]] replaced [[newton|Newton]]'s invisible force of gravity with something stranger and more beautiful: mass and energy curving the fabric of spacetime, and objects simply following the straightest possible path through that curve. It was a theory about geometry — but tucked inside its equations was an implication [[einstein|Einstein]] himself initially resisted.",
      },
      {
        nodeId: "friedmann-equations",
        narrative:
          "That implication was uncovered by a Russian mathematician named [[alexander-friedmann|Alexander Friedmann]]. When he applied [[einstein|Einstein]]'s own equations to the universe as a whole, they refused to describe a static, unchanging cosmos — they described a universe that must be either expanding or contracting. Einstein was so uncomfortable with the result that he initially dismissed it as a mathematical error. Friedmann died of typhoid fever at 37, before he lived to see himself proven right.",
      },
      {
        nodeId: "georges-lemaitre",
        narrative:
          "A Belgian priest and physicist named [[georges-lemaitre|Georges Lemaître]] picked up the thread. If the universe truly is expanding, he reasoned, then running the clock backward should lead to a moment when all matter, all space, and all time were compressed into a single point. He called it the \"primeval atom.\" [[einstein|Einstein]], upon hearing the idea, reportedly told him: \"Your math is correct, but your physics is abominable.\" Time would prove otherwise.",
      },
      {
        nodeId: "big-bang-theory",
        narrative:
          "[[georges-lemaitre|Lemaître]]'s primeval atom is what we now call the [[big-bang-theory|Big Bang]] — and it didn't stay a mathematical curiosity for long. [[edwin-hubble|Edwin Hubble]] found galaxies rushing away from us, exactly as an expanding universe predicted. [[george-gamow|George Gamow]] calculated that the newborn universe should have left behind a faint afterglow of radiation. And in 1965, two radio astronomers named [[arno-penzias|Arno Penzias]] and [[robert-wilson|Robert Wilson]] found that exact afterglow — by accident, while trying to track down an annoying hiss in their antenna they'd first blamed on pigeon droppings. Twenty-three centuries after [[aristotle|Aristotle]] first insisted the cosmos was orderly enough to understand, we found its birth cry, still echoing across the sky.",
      },
    ],
  },
  {
    id: "the-birth-of-modern-medicine",
    title: "The Birth of Modern Medicine",
    teaser:
      "From a Greek physician who insisted disease had natural causes to the discovery of the molecule that carries life's instructions — nine steps, twenty-three centuries, one unbroken thread.",
    disciplines: ["Medicine", "Biology"],
    steps: [
      {
        nodeId: "hippocrates",
        narrative:
          "Our story begins on the Greek island of Kos, with a physician who made a radical claim for his time: illness wasn't a punishment from the gods, but a natural process with natural causes that could be observed, tracked, and understood. [[hippocrates|Hippocrates]]'s insistence on careful clinical observation over superstition is why medicine still bears his name in the oath new doctors take today.",
      },
      {
        nodeId: "galen",
        narrative:
          "Four centuries later, the physician [[galen|Galen]] took what [[hippocrates|Hippocrates]] began and built an entire anatomical system on top of it — dissecting animals, treating gladiators, and writing medical texts so thorough and so authoritative that they would go essentially unquestioned in both Europe and the Islamic world for the next thirteen hundred years.",
      },
      {
        nodeId: "ibn-sina",
        narrative:
          "That authority passed to the Islamic Golden Age, where the Persian polymath [[ibn-sina|Ibn Sina]] — known in the West as Avicenna — synthesized [[galen|Galen]], [[hippocrates|Hippocrates]], and centuries of accumulated Islamic medical knowledge into something no one had attempted before: a single, rigorously organized medical encyclopedia.",
      },
      {
        nodeId: "canon-of-medicine",
        narrative:
          "The result, the [[canon-of-medicine|Canon of Medicine]], became the standard medical textbook not just across the Islamic world but in European universities too — required reading for physicians for roughly six hundred years after it was written.",
      },
      {
        nodeId: "andreas-vesalius",
        narrative:
          "Six hundred years is a long time for anyone's word to go unchallenged. In 1543, the young anatomist [[andreas-vesalius|Andreas Vesalius]] published a lavishly illustrated atlas of the human body based on something remarkably simple and remarkably overdue: actually dissecting humans, rather than relying on [[galen|Galen]]'s centuries-old animal anatomy. Hundreds of Galen's errors — accepted as fact for a millennium — quietly disappeared.",
      },
      {
        nodeId: "william-harvey",
        narrative:
          "[[andreas-vesalius|Vesalius]] showed what the body was built from. [[william-harvey|William Harvey]] figured out how it worked. Through careful experiment, Harvey demonstrated that the heart is a pump driving blood in a continuous, closed circuit through the body — directly contradicting [[galen|Galen]]'s belief that blood was continuously produced and consumed like fuel.",
      },
      {
        nodeId: "louis-pasteur",
        narrative:
          "For centuries after [[william-harvey|Harvey]], disease itself was still often blamed on \"bad air\" or internal imbalance. [[louis-pasteur|Louis Pasteur]] helped end that idea for good, demonstrating that specific, invisible microorganisms — not miasma, not humors — cause specific diseases. Germ theory didn't just explain illness; it explained how to prevent it, from pasteurization to vaccination.",
      },
      {
        nodeId: "oswald-avery",
        narrative:
          "[[louis-pasteur|Pasteur]] showed that microorganisms cause disease. [[oswald-avery|Oswald Avery]] spent decades asking a quieter, deeper question: what, exactly, inside a cell carries the instructions for heredity? Through a painstaking set of experiments on pneumonia bacteria, Avery identified the answer — not protein, as almost everyone had assumed, but DNA.",
      },
      {
        nodeId: "molecular-biology",
        narrative:
          "[[oswald-avery|Avery]]'s discovery opened the door to an entirely new way of understanding life — not at the level of organs or even cells, but at the level of molecules. [[molecular-biology|Molecular biology]], the field built on that foundation, would go on to reveal the structure of DNA itself and, eventually, the complete instruction set for a human being. Twenty-three centuries after [[hippocrates|Hippocrates]] first insisted that the body could be understood rather than merely endured, we learned to read its source code.",
      },
    ],
  },
  {
    id: "how-algebra-got-its-name",
    title: "How Algebra Got Its Name",
    teaser:
      "One book, one Persian mathematician, and a single Arabic word that quietly became the name of an entire branch of mathematics.",
    disciplines: ["Mathematics"],
    steps: [
      {
        nodeId: "al-khwarizmi",
        narrative:
          "In ninth-century Baghdad, at the [[house-of-wisdom|House of Wisdom]] — a library and translation center built to gather the world's mathematical and scientific knowledge in one place — a Persian mathematician named [[al-khwarizmi|Al-Khwarizmi]] sat down to write a book about solving equations. He drew on older traditions, including the [[hindu-arabic-numeral-system|Hindu-Arabic numeral system]] that had reached Baghdad from India, but the method he systematized was distinctly his own.",
      },
      {
        nodeId: "algebra",
        narrative:
          "[[al-khwarizmi|Al-Khwarizmi]]'s technique for solving equations relied on a specific move: rebalancing an equation by moving a term from one side to the other. He called this operation al-jabr — roughly, \"reunion of broken parts,\" or \"completion.\" It's a strange thing to realize that an entire field of mathematics carries the name of a single word from a single book's title, quietly Latinized over the centuries into the word we use today: [[algebra|algebra]].",
      },
    ],
  },
];

export interface StoryPointLocation {
  storyId: string;
  stepIndex: number;
}

// Used by DetailsPanel to determine whether a node has a "story point"
// button to show at all, and if so, where clicking it should navigate to.
// Checks stories in order and returns the first match — a node appearing
// in more than one story isn't expected currently, but if it ever
// happens, this deterministically picks the earliest-defined story.
export function findStoryPointForNode(
  nodeId: string,
): StoryPointLocation | null {
  for (const story of STORIES) {
    const stepIndex = story.steps.findIndex((step) => step.nodeId === nodeId);
    if (stepIndex !== -1) {
      return { storyId: story.id, stepIndex };
    }
  }
  return null;
}