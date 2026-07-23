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
  {
    id: "how-logic-learned-to-think",
    title: "How Logic Learned to Think",
    teaser:
      "From a Greek geometer's proofs to a quantum algorithm that could break modern encryption — the twenty-three-century argument that reasoning itself could be reduced to symbols, and machines could be built to carry it out.",
    disciplines: ["Mathematics", "Computer Science", "Physics"],
    steps: [
      {
        nodeId: "euclid",
        narrative:
          "Every step in this story rests, ultimately, on a habit of mind [[euclid|Euclid]] made rigorous in Alexandria around 300 BCE: that a claim isn't true because it sounds right, but because it follows, step by unbreakable step, from what came before. That's not just geometry. It's the seed of every formal system that follows — including, eventually, the machines built to carry reasoning out mechanically.",
      },
      {
        nodeId: "elements",
        narrative:
          "[[elements|The Elements]] didn't just prove theorems about triangles and circles. It modeled what a proof itself should look like — a small set of starting assumptions, and everything else derived from them without appeal to intuition or authority. That template for airtight, mechanical derivation would resurface, radically transformed, in a ninth-century Baghdad scholar's own very different project.",
      },
      {
        nodeId: "al-khwarizmi",
        narrative:
          "[[al-khwarizmi|Al-Khwarizmi]] took the rigor Euclid brought to shapes and pointed it at something more abstract: the manipulation of unknowns themselves. His systematic procedures for solving equations — rebalance, complete, reduce — were the first clear glimpse of an idea that would define computing a thousand years later: that reasoning could be broken into a fixed sequence of mechanical steps, an algorithm, indifferent to who or what carried it out.",
      },
      {
        nodeId: "algebra",
        narrative:
          "That word — al-jabr, \"reunion of broken parts\" — quietly Latinized over the centuries into [[algebra|algebra]]. What Al-Khwarizmi left behind wasn't just a set of solved problems, but a general method: a symbolic system where the letters themselves could be manipulated by rule, whatever numbers they eventually stood for. Six centuries later, an English mathematician would apply exactly that move to something Al-Khwarizmi never imagined algebra could touch: the truth or falsehood of a sentence.",
      },
      {
        nodeId: "george-boole",
        narrative:
          "[[george-boole|George Boole]] asked a strange question: could logic itself — the rules governing \"and,\" \"or,\" and \"not\" — be written as equations, and solved the way Al-Khwarizmi solved for x? His 1854 answer treated true and false as though they were 1 and 0, reasoning as though it were arithmetic. He had no way of knowing that this specific reduction — logic to two symbols and a handful of operations — was the exact language every digital computer would eventually speak.",
      },
      {
        nodeId: "boolean-algebra",
        narrative:
          "[[boolean-algebra|Boolean algebra]] sat as a mathematical curiosity for eight decades — an elegant way to formalize logic, with no obvious machine attached to it. Then, in 1937, a 21-year-old graduate student made a connection nobody had quite put together before: that an electrical switch, being either on or off, was already a physical embodiment of Boole's true and false.",
      },
      {
        nodeId: "symbolic-analysis-relay-switching-circuits",
        narrative:
          "That student's master's thesis, [[symbolic-analysis-relay-switching-circuits|A Symbolic Analysis of Relay and Switching Circuits]], showed that any circuit of switches could be designed and simplified using exactly Boole's algebra — turning circuit design from an art into a mathematical procedure. It's often called the most important master's thesis of the twentieth century, and it is the direct, traceable bridge between a Victorian mathematician's abstract logic and the processor running whatever you're reading this on.",
      },
      {
        nodeId: "claude-shannon",
        narrative:
          "Its author was [[claude-shannon|Claude Shannon]], who would go on to found information theory itself. But in 1943, before any of that, he had tea in the Bell Labs cafeteria with a British visitor working — for reasons he wasn't allowed to explain — on cryptography. They talked, repeatedly, about a subject neither of them could yet build: whether a machine could think.",
      },
      {
        nodeId: "alan-turing",
        narrative:
          "That visitor was [[alan-turing|Alan Turing]], and he'd already spent years thinking about the limits of mechanical reasoning — years before machines existed that could test any of it. Seven years earlier, he'd published an answer to a question about mathematics itself, by imagining an impossibly simple machine.",
      },
      {
        nodeId: "turing-machine",
        narrative:
          "Turing's [[turing-machine|Turing Machine]] wasn't a device anyone built — it was a thought experiment: a strip of tape, a set of simple rules, and a pointer that reads, writes, and moves. He showed that this almost absurdly minimal setup could, in principle, carry out any computation whatsoever. Every computer since — from the first vacuum-tube giants to the phone in your pocket — is, in the precise mathematical sense, just an elaboration of this idea.",
      },
      {
        nodeId: "notes-on-the-analytical-engine",
        narrative:
          "The idea wasn't entirely without precedent. A century earlier, working from a machine that was never actually finished, [[notes-on-the-analytical-engine|a set of notes]] had already described something eerily close: a general-purpose procedure a machine could follow, expressed as a precise, mechanical sequence of steps.",
      },
      {
        nodeId: "ada-lovelace",
        narrative:
          "Those notes were [[ada-lovelace|Ada Lovelace]]'s. Translating and annotating an Italian engineer's account of Charles Babbage's proposed machine, her own additions ended up three times longer than the original — and included what's often considered the first algorithm ever written for a machine that didn't yet exist, along with a striking intuition that such a machine might one day manipulate more than just numbers.",
      },
      {
        nodeId: "charles-babbage",
        narrative:
          "The machine Lovelace was writing about belonged to [[charles-babbage|Charles Babbage]], who had designed a fully programmable mechanical computer — the Analytical Engine — decades before electricity made computing practical. It was never built in his lifetime. But the vision it represented — a single general-purpose machine, reconfigurable for any task rather than built for one — was exactly the vision Turing would formalize mathematically, and exactly the vision that would need an entirely new kind of hardware to finally realize.",
      },
      {
        nodeId: "information-age",
        narrative:
          "Babbage's unbuilt vision, Boole's abstract logic, Shannon's switching circuits, and Turing's universal machine were four separate threads, developed decades or centuries apart, that all turned out to be describing pieces of the same underlying idea. Together they gave the emerging [[information-age|Information Age]] its actual technical foundation — a foundation still waiting, in the 1940s, for a physical technology that could build it at scale.",
      },
      {
        nodeId: "transistor",
        narrative:
          "That technology arrived in 1947 at Bell Labs, in the form of the [[transistor|transistor]] — small, reliable, and endlessly reproducible in a way the room-sized vacuum-tube computers of the era simply weren't. Every one of Turing's abstract machine's physical descendants, from mainframes to smartphones, would be built from transistors from this point on.",
      },
      {
        nodeId: "artificial-intelligence",
        narrative:
          "With computers now cheap and reliable enough to actually build, the question Shannon and Turing had traded over tea in 1943 — can a machine think? — stopped being purely philosophical. In 1956, a small group of researchers gathered at Dartmouth College and gave that question a name: [[artificial-intelligence|Artificial Intelligence]].",
      },
      {
        nodeId: "john-mccarthy",
        narrative:
          "[[john-mccarthy|John McCarthy]] coined the term and organized that workshop, betting that machine intelligence could be built the way Boole had built logic: as explicit symbols and rules, manipulated according to precise procedures.",
      },
      {
        nodeId: "symbolic-ai",
        narrative:
          "That bet became [[symbolic-ai|Symbolic AI]] — encode the facts, encode the rules, let the machine reason over them directly. It could play chess and prove theorems. It struggled badly with anything a five-year-old finds effortless: recognizing a face, understanding an ordinary sentence, catching a ball.",
      },
      {
        nodeId: "marvin-minsky",
        narrative:
          "[[marvin-minsky|Marvin Minsky]] was one of symbolic AI's own architects — and also, in 1969, one of its rivals' sharpest critics. Together with Seymour Papert, he published a rigorous mathematical proof that a competing approach to machine intelligence had a fundamental, structural limitation.",
      },
      {
        nodeId: "perceptron",
        narrative:
          "That rival was the [[perceptron|Perceptron]] — a machine, built in 1958, that learned from examples rather than following rules at all, adjusting its own internal weights the way a nervous system might. Minsky and Papert's proof that a single-layer perceptron couldn't solve certain basic problems was mathematically airtight, and its practical effect was chilling: neural-network research went largely dormant for over a decade.",
      },
      {
        nodeId: "deep-learning",
        narrative:
          "The underlying idea didn't die — it waited. Learning from data rather than rules, extended to many stacked layers rather than one, revived by researchers including [[geoffrey-hinton|Geoffrey Hinton]] and finally given enough data and computing power to work, it re-emerged decades later as [[deep-learning|Deep Learning]] — and this time, it didn't just survive criticism. It came to dominate the entire field, doing exactly the things — recognizing faces, understanding language — that symbolic AI had never managed.",
      },
      {
        nodeId: "quantum-computing",
        narrative:
          "Deep learning's success came from betting everything on a completely different computing paradigm than the one AI's founders had assumed. At almost the same moment, physicists were asking whether an even more fundamental assumption about computation might also be wrong. [[richard-feynman|Richard Feynman]] pointed out in 1981 that ordinary computers can never efficiently simulate quantum systems — and proposed that only a computer built from quantum mechanics itself could do it. [[david-deutsch|David Deutsch]] then did for quantum computers what Turing had done for classical ones: he defined a universal quantum machine, and showed it could, in principle, simulate any physical process at all — extending [[turing-machine|Turing's]] own framework into a realm Turing never lived to see.",
      },
      {
        nodeId: "shors-algorithm",
        narrative:
          "For over a decade, [[quantum-computing|quantum computing]] remained a beautiful theoretical curiosity, with no result urgent enough to justify the immense difficulty of actually building one. Then in 1994, [[shors-algorithm|Shor's Algorithm]] changed that overnight: a demonstration that a quantum computer could factor large numbers exponentially faster than any classical machine ever could.",
      },
      {
        nodeId: "peter-shor",
        narrative:
          "[[peter-shor|Peter Shor]]'s result mattered because modern encryption depends entirely on factoring large numbers being practically impossible for any classical computer. A sufficiently powerful quantum computer, his algorithm showed, would break that assumption completely — turning quantum computing, in a single stroke, from a philosopher's curiosity about the limits of simulation into one of the most strategically consequential open engineering problems in the world. Twenty-three centuries after a Greek geometer insisted that truth could be built step by unbreakable step from first principles, the machines built to embody that idea are now powerful enough to threaten to break the codes the entire digital world runs on.",
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