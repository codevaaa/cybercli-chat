/**
 * Codeva Grammar Engine — Local-first hybrid intelligence.
 *
 * Layer 1 (INSTANT, <5ms): client-side rule checks — spelling, capitalization,
 *   double words, spacing, common confusions. Runs on every check with zero latency.
 * Layer 2 (ADVANCED, API): deep grammar/clarity/tone via LLM, cached + debounced.
 *
 * This mirrors how Grammarly works: fast on-device checks + server for nuance.
 * Self-contained — no imports (loaded into content script context via <script>).
 */

// ─── Common misspellings dictionary (high-frequency errors) ────────────────────
const COMMON_MISSPELLINGS = {
  teh: 'the', recieve: 'receive', seperate: 'separate', occured: 'occurred',
  untill: 'until', wich: 'which', becuase: 'because', definately: 'definitely',
  accomodate: 'accommodate', acheive: 'achieve', beleive: 'believe',
  calender: 'calendar', cemetary: 'cemetery', collegue: 'colleague',
  concious: 'conscious', embarass: 'embarrass', enviroment: 'environment',
  existance: 'existence', foriegn: 'foreign', goverment: 'government',
  grammer: 'grammar', gaurd: 'guard', harrass: 'harass', independant: 'independent',
  liason: 'liaison', maintainance: 'maintenance', neccessary: 'necessary',
  noticable: 'noticeable', occassion: 'occasion', persistant: 'persistent',
  privelege: 'privilege', publically: 'publicly', reccomend: 'recommend',
  refered: 'referred', relevent: 'relevant', succesful: 'successful',
  tommorow: 'tomorrow', truely: 'truly', unfortunatly: 'unfortunately',
  wierd: 'weird', writen: 'written', alot: 'a lot', thier: 'their',
  youre: "you're", wont: "won't", cant: "can't", dont: "don't",
  isnt: "isn't", didnt: "didn't", wouldnt: "wouldn't", couldnt: "couldn't",
  shouldnt: "shouldn't", hasnt: "hasn't", havent: "haven't", wasnt: "wasn't",
  werent: "weren't", arent: "aren't", doesnt: "doesn't", im: "I'm",
  ive: "I've", ill: "I'll", id: "I'd", lets: "let's", thats: "that's",
  whats: "what's", hes: "he's", shes: "she's", theyre: "they're",
  wanna: 'want to', gonna: 'going to', gotta: 'got to', kinda: 'kind of',
  sorta: 'sort of', cuz: 'because', tho: 'though', thru: 'through',
  ur: 'your', u: 'you', r: 'are', pls: 'please', plz: 'please',
  thx: 'thanks', ppl: 'people', bcz: 'because', bcoz: 'because',
}

// ─── Commonly confused word pairs ──────────────────────────────────────────────
const CONFUSIONS = [
  { wrong: /\bits\s+(a|an|the|going|been|not|very)\b/gi, hint: "its → it's (possessive vs contraction)", check: 'its_possessive' },
  { wrong: /\byour\s+(welcome|right|wrong|going|not)\b/gi, hint: "your → you're", check: 'your' },
  { wrong: /\bthere\s+(is|are|going)\s+\w+\s+(car|house|book|thing)/gi, hint: 'there → their (possessive)', check: 'there' },
  { wrong: /\bto\s+(much|many|late|early)\b/gi, hint: 'to → too', check: 'to_too' },
  { wrong: /\bthen\s+(better|worse|more|less)\b/gi, hint: 'then → than (comparison)', check: 'then_than' },
  { wrong: /\baffect\s+(on|of)\b/gi, hint: 'affect → effect (noun)', check: 'affect' },
  { wrong: /\bcould\s+of\b/gi, hint: 'could of → could have', check: 'could_of' },
  { wrong: /\bwould\s+of\b/gi, hint: 'would of → would have', check: 'would_of' },
  { wrong: /\bshould\s+of\b/gi, hint: 'should of → should have', check: 'should_of' },
]

// Small English dictionary for "is this even a word?" detection (top ~2000 words
// would be huge; instead we use heuristics + the misspelling map + vowel checks)
const COMMON_WORDS = new Set([
  'the','be','to','of','and','a','in','that','have','i','it','for','not','on','with','he','as','you','do','at',
  'this','but','his','by','from','they','we','say','her','she','or','an','will','my','one','all','would','there',
  'their','what','so','up','out','if','about','who','get','which','go','me','when','make','can','like','time','no',
  'just','him','know','take','people','into','year','your','good','some','could','them','see','other','than','then',
  'now','look','only','come','its','over','think','also','back','after','use','two','how','our','work','first','well',
  'way','even','new','want','because','any','these','give','day','most','us','is','was','are','been','has','had','were',
  'said','did','get','made','find','here','thing','give','many','well','hello','hi','hey','thanks','thank','please',
  'yes','no','okay','ok','cool','nice','great','awesome','sure','maybe','search','cyber','security','code','coding',
])

/**
 * LAYER 1 — Instant local grammar check. Returns array of issues.
 */
export function localGrammarCheck(text) {
  const issues = []
  if (!text || text.length < 2) return issues

  // 1. Spelling from common misspellings map
  const words = text.match(/\b[a-zA-Z']+\b/g) || []
  const seen = new Set()
  for (const word of words) {
    const lower = word.toLowerCase()
    if (seen.has(lower)) continue
    if (COMMON_MISSPELLINGS[lower]) {
      const correct = COMMON_MISSPELLINGS[lower]
      // Preserve capitalization
      const suggestion = word[0] === word[0].toUpperCase()
        ? correct[0].toUpperCase() + correct.slice(1)
        : correct
      issues.push({ original: word, suggestion, type: 'spelling', reason: `Common misspelling`, source: 'local' })
      seen.add(lower)
    }
  }

  // 2. Confused word pairs
  for (const c of CONFUSIONS) {
    if (c.wrong.test(text)) {
      const match = text.match(c.wrong)
      if (match) {
        issues.push({ original: match[0], suggestion: '(check)', type: 'grammar', reason: c.hint, source: 'local' })
      }
      c.wrong.lastIndex = 0
    }
  }

  // 3. Double words ("the the", "is is")
  const doubleWord = /\b(\w+)\s+\1\b/gi
  let dm
  while ((dm = doubleWord.exec(text)) !== null) {
    issues.push({ original: dm[0], suggestion: dm[1], type: 'grammar', reason: 'Repeated word', source: 'local' })
  }

  // 4. Double spaces
  if (/  +/.test(text)) {
    issues.push({ original: '  ', suggestion: ' ', type: 'punctuation', reason: 'Multiple spaces', source: 'local' })
  }

  // 5. Space before punctuation
  const spaceBeforePunct = text.match(/\s+[,.!?;:]/g)
  if (spaceBeforePunct) {
    issues.push({ original: spaceBeforePunct[0], suggestion: spaceBeforePunct[0].trim(), type: 'punctuation', reason: 'Space before punctuation', source: 'local' })
  }

  // 6. Lowercase 'i' as a standalone pronoun
  const loneI = /\b(i)\b(?!['’])/g
  let im
  while ((im = loneI.exec(text)) !== null) {
    if (im[1] === 'i') {
      issues.push({ original: 'i', suggestion: 'I', type: 'grammar', reason: 'Pronoun "I" must be capitalized', source: 'local' })
      break
    }
  }

  // 7. Sentence not starting with capital (only for multi-word text)
  if (words.length >= 3) {
    const firstChar = text.trim()[0]
    if (firstChar && /[a-z]/.test(firstChar)) {
      const firstWord = text.trim().split(/\s+/)[0]
      issues.push({ original: firstWord, suggestion: firstWord[0].toUpperCase() + firstWord.slice(1), type: 'grammar', reason: 'Sentence should start with a capital letter', source: 'local' })
    }
  }

  // 8. Likely-not-a-word detection (gibberish / incomplete words)
  //    Heuristic: word 4+ chars, not in dictionary, not a misspelling we know,
  //    has no vowel OR unusual letter patterns → flag as possible typo.
  for (const word of words) {
    const lower = word.toLowerCase()
    if (seen.has(lower) || lower.length < 4) continue
    if (COMMON_WORDS.has(lower) || COMMON_MISSPELLINGS[lower]) continue
    const hasVowel = /[aeiou]/i.test(lower)
    const tooManyConsonants = /[bcdfghjklmnpqrstvwxyz]{5,}/i.test(lower)
    const looksIncomplete = !hasVowel || tooManyConsonants
    // Only flag if it really looks off (avoid flagging valid uncommon words)
    if (looksIncomplete) {
      issues.push({ original: word, suggestion: '(verify spelling)', type: 'spelling', reason: 'Possible typo or incomplete word', source: 'local', lowConfidence: true })
      seen.add(lower)
    }
  }

  return issues
}

/**
 * Detect tone locally (fast heuristic) — refined by API later.
 */
export function localToneDetect(text) {
  const lower = text.toLowerCase()
  if (/\b(hereby|pursuant|regards|sincerely|furthermore|therefore|kindly)\b/.test(lower)) return 'formal'
  if (/\b(lol|haha|gonna|wanna|yeah|cool|awesome|dude|hey)\b/.test(lower)) return 'casual'
  if (/\b(must|will|definitely|certainly|guarantee|absolutely|ensure)\b/.test(lower)) return 'confident'
  if (/\b(thanks|please|appreciate|happy|glad|love|wonderful)\b/.test(lower)) return 'friendly'
  if (/[!]{2,}|\b(stupid|hate|terrible|awful|ridiculous)\b/.test(lower)) return 'aggressive'
  return 'neutral'
}
