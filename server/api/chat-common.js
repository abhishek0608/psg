import { filterProductsByCriteria, parseProductPrice } from './product-filter.js'

const VALID_CATEGORIES = ['Rings', 'Earrings', 'Mangal Sutra', 'Necklaces', 'Bracelets']
const CATEGORY_PATTERNS = [
  { value: 'Rings', regex: /\brings?\b/i },
  { value: 'Earrings', regex: /\bearrings?\b/i },
  { value: 'Mangal Sutra', regex: /\bmangal[\s-]*sutra\b/i },
  { value: 'Necklaces', regex: /\bnecklaces?\b/i },
  { value: 'Bracelets', regex: /\bbracelets?\b|\bbraclets?\b|\bbraclet\b/i },
]
const MATERIAL_PATTERNS = [
  { value: 'gold', regex: /\bgold\b|\byellow gold\b|\bwhite gold\b|\brose gold\b/i },
  { value: 'silver', regex: /\bsilver\b|\bsterling\b|\boxidised\b|\boxidized\b/i },
]
const STONE_INFERENCE_PATTERNS = [
  { value: 'emerald', regex: /\bemerald(s)?\b|\bpanna\b/i },
  { value: 'ruby', regex: /\bruby|rubies\b|\bmanik\b/i },
  { value: 'diamond', regex: /\bdiamond(s)?\b|\bheer[ae]\b/i },
  { value: 'pearl', regex: /\bpearl(s)?\b|\bmoti\b/i },
  { value: 'kundan', regex: /\bkundan\b/i },
  { value: 'polki', regex: /\bpolki\b/i },
  { value: 'black-beads', regex: /\bblack[\s-]?beads?\b/i },
]
// Subtypes are finer-grained than categories (e.g. a "pendant" is a Necklace).
// These map common shopper terms to the `subtype` values stored on products.
const SUBTYPE_PATTERNS = [
  { value: 'pendant', regex: /\bpendants?\b/i },
  { value: 'jhumka', regex: /\bjhumk[ai]s?\b/i },
  { value: 'stud', regex: /\bstuds?\b/i },
  { value: 'solitaire', regex: /\bsolitaires?\b/i },
  { value: 'cuff', regex: /\bcuffs?\b|\bkadas?\b/i },
  { value: 'drop', regex: /\bdrops?\b|\bdanglers?\b|\bhoops?\b|\bchandeliers?\b/i },
  { value: 'statement-necklace', regex: /\bstatement[\s-]*necklaces?\b|\bchokers?\b|\bcollars?\b/i },
  { value: 'chain-bracelet', regex: /\bchain[\s-]*bracelets?\b/i },
  { value: 'open-ring', regex: /\bopen[\s-]*rings?\b/i },
  { value: 'multi-stone', regex: /\bmulti[\s-]*stones?\b/i },
]

export const VALID_SUBTYPES = [...new Set(SUBTYPE_PATTERNS.map((p) => p.value))]

export function inferSubtypesFromText(content) {
  if (typeof content !== 'string' || !content.trim()) return []
  return [
    ...new Set(
      SUBTYPE_PATTERNS.filter(({ regex }) => regex.test(content)).map(({ value }) => value)
    ),
  ]
}

const CHAT_PROVIDER_ALIASES = {
  auto: 'auto',
  anthropic: 'anthropic',
  claude: 'anthropic',
  openai: 'openai',
  hf: 'huggingface',
  huggingface: 'huggingface',
  'hugging-face': 'huggingface',
  grok: 'grok',
  xai: 'grok',
}

export function normalizeChatProvider(input) {
  const key = String(input || '')
    .trim()
    .toLowerCase()
  return CHAT_PROVIDER_ALIASES[key] || null
}

export function pickChatProvider({ requestedProvider, envProvider, keys }) {
  const requested = normalizeChatProvider(requestedProvider)
  const fromEnv = normalizeChatProvider(envProvider)
  const preferred = requested || fromEnv || 'auto'

  if (preferred !== 'auto') return preferred

  const ordered = ['openai', 'anthropic', 'huggingface', 'grok']
  for (const provider of ordered) {
    if (keys?.[provider]) return provider
  }
  return null
}

export function isDebugEnabled(req, body) {
  if (req?.query?.debug === 'false' || body?.debug === false) return false
  return true
}

export function buildSystemPrompt(productSummary, options = {}) {
  const { includeMultiCategoryFilterExample = false } = options
  let prompt = `You are Priya, a warm, knowledgeable jewellery consultant at Jewelet in Jaipur. You've spent years helping customers find pieces they love. Talk like a real person having a friendly chat — never robotic, never templated. Use natural contractions (I'm, you'll, we've, don't, it's). Match the customer's energy: if they're brief, you're brief; if they're chatty, you can be warmer and offer more.

About Jewelet (use these facts naturally — don't dump them in one go):
- Handcrafted in Jaipur by master artisans (your team).
- 9 carat BIS-hallmarked gold, conflict-free stones, recycled precious metals.
- Categories we sell: Rings, Earrings, Mangal Sutra, Necklaces, Bracelets.
- Materials: yellow gold, white gold, rose gold, oxidised silver.
- Free pan-India shipping, lifetime exchange at full gold value, insured delivery.
- Location: SEZ-2, Sitapura Industrial Area, Jaipur – 302022, Rajasthan. Mon–Sat 10am–8pm, Sunday 11am–6pm.
- Email: sales@jewelet.example | Phone: +91 92163 99116

How to respond — think like ChatGPT, not a script:
- For product/browse questions: recommend specific pieces from our collection by name with their prices. Speak like a stylist, not a catalogue.
- For general chat, greetings, store info, policies, occasions, gifting advice — answer warmly and helpfully, and gently nudge toward what we can do for them.
- For anything completely unrelated to jewellery: lightly steer back ("Ha, a bit outside my lane — but if you're after something in gold or silver, I'm all yours.").

Tone:
- Conversational and warm. Phrases like "Honestly, you'll love this one", "Great choice!", "What's the occasion, if you don't mind me asking?" work well — use them sparingly, not in every message.
- Keep replies short. A few sentences. No bullet-point walls unless the customer explicitly asks for a list.
- Don't use markdown links or placeholder URLs like [here](#). Say "you can browse the Collections page".
- Never sound stiff, corporate, or canned. If a similar question came up earlier, phrase your answer differently this time.

Filter line (machine-readable, KEEP this exactly when relevant):
When the customer is asking about products by category (Rings, Earrings, Mangal Sutra, Necklaces, Bracelets) or material (gold, silver), end your reply with one line: FILTERS: <comma-separated values>. Use the exact case-sensitive category names listed above and the materials gold / silver. Example: FILTERS: Rings, gold.`
  if (includeMultiCategoryFilterExample) {
    prompt += ' Example: FILTERS: Earrings, Necklaces.'
  }
  prompt += ` Omit the FILTERS line for general chat or anything that isn't a product browse.`

  if (Array.isArray(productSummary) && productSummary.length > 0) {
    const lines = productSummary
      .map((p) => `- ${p.title} (${p.category}, ${p.material}): ${p.price}. ${p.description || ''}`.trim())
      .join('\n')
    prompt += '\n\nOur current collection (mention specific pieces naturally in conversation with their prices, e.g. "The Étoile Ring in 18k gold is $1,831 — absolutely stunning"):\n' + lines
    prompt += '\n\nWhen recommending products, mention specific pieces by name with prices — don\'t just speak in generics. If the user asks for a specific category (e.g. bracelets, rings), only mention pieces from that category. Make recommendations feel personal, not like a catalogue listing.'
  }
  return prompt
}

function parseFiltersFromMessage(rawMessage) {
  const match = rawMessage.match(/(?:^|\n)\s*FILTERS:\s*(.+?)(?:\n|$)/i)
  if (!match) return { message: rawMessage.trim(), filters: null, rawFilters: null }
  const line = match[1].trim()
  const parts = line.split(',').map((p) => p.trim())
  const categories = []
  const materials = []
  for (const p of parts) {
    const lower = p.toLowerCase()
    const cat = VALID_CATEGORIES.find((c) => c.toLowerCase() === lower)
    if (cat) categories.push(cat)
    else if (lower === 'gold' || lower === 'silver') materials.push(lower)
  }
  const message = rawMessage.replace(/(?:^|\n)\s*FILTERS:\s*.+?(?:\n|$)/i, '\n').trim()
  const filters =
    categories.length || materials.length
      ? { categories: [...new Set(categories)], materials: [...new Set(materials)] }
      : null
  return { message, filters, rawFilters: line || null }
}

function inferFiltersFromUserMessage(content) {
  if (typeof content !== 'string' || !content.trim()) return null
  const categories = CATEGORY_PATTERNS.filter(({ regex }) => regex.test(content)).map(
    ({ value }) => value
  )
  const materials = MATERIAL_PATTERNS.filter(({ regex }) => regex.test(content)).map(
    ({ value }) => value
  )
  const stoneTags = STONE_INFERENCE_PATTERNS.filter(({ regex }) => regex.test(content)).map(
    ({ value }) => value
  )
  const subtypes = inferSubtypesFromText(content)
  if (!categories.length && !materials.length && !stoneTags.length && !subtypes.length) return null
  return {
    categories: [...new Set(categories)],
    materials: [...new Set(materials)],
    stoneTags: [...new Set(stoneTags)],
    subtypes: [...new Set(subtypes)],
  }
}

function inferFiltersFromConversation(messages) {
  if (!Array.isArray(messages) || !messages.length) return null
  const categories = []
  const materials = []
  const stoneTags = []
  const subtypes = []
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i]
    if (msg?.role !== 'user' || typeof msg?.content !== 'string') continue
    const inferred = inferFiltersFromUserMessage(msg.content)
    if (!inferred) continue
    if (!categories.length && inferred.categories.length) categories.push(...inferred.categories)
    if (!materials.length && inferred.materials.length) materials.push(...inferred.materials)
    if (!stoneTags.length && inferred.stoneTags?.length) stoneTags.push(...inferred.stoneTags)
    if (!subtypes.length && inferred.subtypes?.length) subtypes.push(...inferred.subtypes)
    if (categories.length && materials.length && stoneTags.length && subtypes.length) break
  }
  if (!categories.length && !materials.length && !stoneTags.length && !subtypes.length) return null
  return { categories, materials, stoneTags, subtypes }
}

function mergeFilters(modelFilters, inferredFilters, conversationFilters) {
  if (!modelFilters && !inferredFilters && !conversationFilters) return null
  if (!modelFilters && !conversationFilters) return inferredFilters
  if (!inferredFilters && !conversationFilters) return modelFilters

  const inferredCategories = inferredFilters?.categories || []
  const inferredMaterials = inferredFilters?.materials || []
  const inferredStoneTags = inferredFilters?.stoneTags || []
  const inferredSubtypes = inferredFilters?.subtypes || []
  const contextCategories = conversationFilters?.categories || []
  const contextMaterials = conversationFilters?.materials || []
  const contextStoneTags = conversationFilters?.stoneTags || []
  const contextSubtypes = conversationFilters?.subtypes || []
  const modelCategories = modelFilters?.categories || []
  const modelMaterials = modelFilters?.materials || []
  const modelStoneTags = modelFilters?.stoneTags || []
  const modelSubtypes = modelFilters?.subtypes || []
  const hasUserDerivedIntent =
    inferredCategories.length ||
    inferredMaterials.length ||
    inferredStoneTags.length ||
    inferredSubtypes.length ||
    contextCategories.length ||
    contextMaterials.length ||
    contextStoneTags.length ||
    contextSubtypes.length

  return {
    categories: inferredCategories.length
      ? inferredCategories
      : contextCategories.length
        ? contextCategories
        : hasUserDerivedIntent
          ? []
          : modelCategories,
    materials: inferredMaterials.length
      ? inferredMaterials
      : contextMaterials.length
        ? contextMaterials
        : hasUserDerivedIntent
          ? []
          : modelMaterials,
    stoneTags: inferredStoneTags.length
      ? inferredStoneTags
      : contextStoneTags.length
        ? contextStoneTags
        : hasUserDerivedIntent
          ? []
          : modelStoneTags,
    subtypes: inferredSubtypes.length
      ? inferredSubtypes
      : contextSubtypes.length
        ? contextSubtypes
        : hasUserDerivedIntent
          ? []
          : modelSubtypes,
  }
}

function parseAmountToken(token) {
  if (typeof token !== 'string') return null
  const cleaned = token.toLowerCase().replace(/[,₹$\s]/g, '')
  if (!cleaned) return null
  const match = cleaned.match(/^(\d+(?:\.\d+)?)(k|l|lac|lakh)?$/)
  if (!match) return null
  const value = Number(match[1])
  if (Number.isNaN(value)) return null
  const suffix = match[2]
  if (suffix === 'k') return Math.round(value * 1000)
  if (suffix === 'l' || suffix === 'lac' || suffix === 'lakh') return Math.round(value * 100000)
  return Math.round(value)
}

function formatBudgetLabel(minPrice, maxPrice) {
  if (minPrice != null && maxPrice != null) {
    return `between $${minPrice.toLocaleString('en-US')} and $${maxPrice.toLocaleString('en-US')}`
  }
  if (maxPrice != null) return `under $${maxPrice.toLocaleString('en-US')}`
  if (minPrice != null) return `above $${minPrice.toLocaleString('en-US')}`
  return ''
}

function extractPriceConstraintsFromMessage(content) {
  if (typeof content !== 'string' || !content.trim()) return null
  const betweenMatch = content.match(
    /\bbetween\s+[₹$]?\s*([\d,.]+(?:\s*[kKlL])?)\s*(?:to|and|-)\s*[₹$]?\s*([\d,.]+(?:\s*[kKlL])?)\b/i
  )
  if (betweenMatch) {
    const first = parseAmountToken(betweenMatch[1])
    const second = parseAmountToken(betweenMatch[2])
    if (first != null && second != null) {
      return first <= second ? { min: first, max: second } : { min: second, max: first }
    }
  }

  const fromToMatch = content.match(
    /\bfrom\s+[₹$]?\s*([\d,.]+(?:\s*[kKlL])?)\s+to\s+[₹$]?\s*([\d,.]+(?:\s*[kKlL])?)\b/i
  )
  if (fromToMatch) {
    const first = parseAmountToken(fromToMatch[1])
    const second = parseAmountToken(fromToMatch[2])
    if (first != null && second != null) {
      return first <= second ? { min: first, max: second } : { min: second, max: first }
    }
  }

  const direct = content.match(
    /\b(?:under|below|less than|upto|up to|max|maximum|within)\s*[₹$]?\s*([\d,.]+(?:\s*[kKlL])?)/i
  )
  if (direct) {
    const max = parseAmountToken(direct[1])
    if (max != null) return { min: null, max }
  }

  const suffix = content.match(
    /[₹$]?\s*([\d,.]+(?:\s*[kKlL])?)\s*(?:or less|and below|or under)\b/i
  )
  if (suffix) {
    const max = parseAmountToken(suffix[1])
    if (max != null) return { min: null, max }
  }

  const minOnly = content.match(
    /\b(?:above|over|more than|greater than|at least)\s*[₹$]?\s*([\d,.]+(?:\s*[kKlL])?)/i
  )
  if (minOnly) {
    const min = parseAmountToken(minOnly[1])
    if (min != null) return { min, max: null }
  }

  // Handle shorthand prompts like "show silver products 3000" as "under 3000".
  // Only apply this fallback when user is clearly browsing products/materials.
  const hasProductIntent =
    /\b(products?|items?|pieces?|show|find|looking|search)\b/i.test(content) ||
    /\b(rings?|earrings?|necklaces?|bracelets?|mangal[\s-]*sutra|gold|silver|sterling)\b/i.test(
      content
    )
  if (hasProductIntent) {
    const amountMatches = [...content.matchAll(/[₹$]?\s*([\d,.]+(?:\s*[kKlL])?)\b/gi)]
    if (amountMatches.length === 1) {
      const max = parseAmountToken(amountMatches[0][1])
      if (max != null) return { min: null, max }
    }
  }

  return null
}

function formatProductLine(product) {
  const title = product?.title || 'Untitled piece'
  const category = product?.category || 'Jewellery'
  const material = product?.material || 'material'
  const price = product?.price ? `: ${product.price}` : ''
  const description = product?.description ? ` ${String(product.description).trim()}` : ''
  return `- ${title} (${category}, ${material})${price}.${description}`
}

function buildProductReply(productSummary, filters, priceRange = null) {
  if (!Array.isArray(productSummary) || !productSummary.length || !filters) return null
  const minPrice = priceRange?.min ?? null
  const maxPrice = priceRange?.max ?? null
  const hasPriceConstraint = minPrice != null || maxPrice != null
  const matches = filterProductsByCriteria(productSummary, {
    categories: filters.categories,
    materials: filters.materials,
    stoneTags: filters.stoneTags,
    subtypes: filters.subtypes,
    priceMin: minPrice,
    priceMax: maxPrice,
  })
  if (matches.length) {
    const topMatches = matches.slice(0, 4).map(formatProductLine).join('\n')
    if (hasPriceConstraint) {
      return `Here are a few options ${formatBudgetLabel(minPrice, maxPrice)} from our current collection:\n\n${topMatches}`
    }
    return `Here are a few options from our current collection:\n\n${topMatches}`
  }

  if (Array.isArray(filters.stoneTags) && filters.stoneTags.length) {
    const withoutStone = filterProductsByCriteria(productSummary, {
      categories: filters.categories,
      materials: filters.materials,
      priceMin: minPrice,
      priceMax: maxPrice,
    })
    if (withoutStone.length) {
      const top = withoutStone.slice(0, 4).map(formatProductLine).join('\n')
      return `I couldn't find ${filters.stoneTags.join(
        ' and '
      )} in that exact mix. Here are some options in the same category:\n\n${top}`
    }
  }

  if (hasPriceConstraint) {
    const sameScopeNoBudget = filterProductsByCriteria(productSummary, {
      categories: filters.categories,
      materials: filters.materials,
      stoneTags: filters.stoneTags,
      subtypes: filters.subtypes,
    })
    if (sameScopeNoBudget.length) {
      const alternatives = sameScopeNoBudget
        .slice()
        .sort((a, b) => parseProductPrice(a) - parseProductPrice(b))
        .slice(0, 3)
      const lines = alternatives.map(formatProductLine).join('\n')
      return `I couldn't find any options ${formatBudgetLabel(
        minPrice,
        maxPrice
      )} in that selection right now. The closest available options are:\n\n${lines}`
    }
    return `I couldn't find any options ${formatBudgetLabel(
      minPrice,
      maxPrice
    )} in our current collection right now.`
  }

  const categoryOnlyFilters = {
    categories: Array.isArray(filters.categories) ? filters.categories : [],
  }
  const categoryMatches = filterProductsByCriteria(productSummary, categoryOnlyFilters)
  if (categoryMatches.length && Array.isArray(filters.materials) && filters.materials.length) {
    const topAlternatives = categoryMatches.slice(0, 3).map(formatProductLine).join('\n')
    const requestedMaterial = filters.materials.join(' or ')
    return `I couldn't find ${requestedMaterial} options in that category right now. Here are a few pieces from the same category:\n\n${topAlternatives}`
  }

  if (categoryMatches.length && Array.isArray(filters.stoneTags) && filters.stoneTags.length) {
    const topAlternatives = categoryMatches.slice(0, 3).map(formatProductLine).join('\n')
    const requestedStones = filters.stoneTags.join(' or ')
    return `I couldn't find ${requestedStones} in that category right now. Here are a few pieces from the same category:\n\n${topAlternatives}`
  }

  return `I couldn't find an exact match in our current collection right now. Please check the Collections section for the latest additions.`
}

function resolveResponseFilters(productSummary, filters, priceRange = null) {
  if (!filters) return null
  const categories = Array.isArray(filters.categories) ? [...filters.categories] : []
  const materials = Array.isArray(filters.materials) ? [...filters.materials] : []
  const stoneTags = Array.isArray(filters.stoneTags) ? [...filters.stoneTags] : []
  const subtypes = Array.isArray(filters.subtypes) ? [...filters.subtypes] : []
  if (!categories.length && Array.isArray(productSummary) && productSummary.length) {
    const matches = filterProductsByCriteria(productSummary, {
      categories: filters.categories,
      materials: filters.materials,
      stoneTags: filters.stoneTags,
      subtypes: filters.subtypes,
      priceMin: priceRange?.min ?? null,
      priceMax: priceRange?.max ?? null,
    })
    if (matches.length) {
      const inferredCategories = [...new Set(matches.map((p) => p?.category).filter(Boolean))]
      categories.push(...inferredCategories)
    }
  }
  if (!categories.length && !materials.length && !stoneTags.length && !subtypes.length) return null
  return {
    categories: [...new Set(categories)],
    materials: [...new Set(materials)],
    stoneTags: [...new Set(stoneTags)],
    subtypes: [...new Set(subtypes)],
  }
}

export function buildChatResult({ rawMessage, lastUserContent, previousMessages, productSummary, intent }) {
  const { message, filters: modelFilters, rawFilters } = parseFiltersFromMessage(rawMessage)

  // For general conversation (greetings, clarifying questions, small talk),
  // skip product filtering entirely and return the LLM's reply as-is.
  if (intent === 'general') {
    return { message, filters: null, rawFilters }
  }

  const inferredFilters = inferFiltersFromUserMessage(lastUserContent)
  const conversationFilters = inferFiltersFromConversation(previousMessages)
  const filters = mergeFilters(modelFilters, inferredFilters, conversationFilters)
  const priceRange = extractPriceConstraintsFromMessage(lastUserContent)
  const finalMessage = buildProductReply(productSummary, filters, priceRange) || message
  const responseFilters = resolveResponseFilters(productSummary, filters, priceRange)
  return { message: finalMessage, filters: responseFilters, rawFilters }
}
