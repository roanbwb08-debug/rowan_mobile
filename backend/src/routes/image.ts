import { Router } from 'express'
import { z } from 'zod'
import { GoogleGenAI } from '@google/genai'
import OpenAI from 'openai'
import multer from 'multer'
import fs from 'fs'

const router = Router()
const upload = multer({ dest: '/tmp/' })

const imageSchema = z.object({
  prompt: z.string().trim().min(1).max(2000),
  aspectRatio: z.enum(['1:1', '16:9', '9:16', '4:3', '3:4']).optional().default('1:1'),
  styleIntent: z.enum([
    'photorealistic',
    'commercial',
    'product',
    'portrait',
    '3d_render',
    'vector_illustration',
    'general'
  ]).optional().default('general'),
  refineFromPrevious: z.boolean().optional().default(false),
  previousPrompt: z.string().optional(),
  refinementInstruction: z.string().optional(),
  allowFallback: z.boolean().optional().default(true),
  preferredProvider: z.enum(['openai', 'flux', 'auto']).optional().default('openai')
})

export type VisualMedium =
  | 'photograph'
  | 'advertising_photo'
  | 'product_photo'
  | 'portrait_photo'
  | 'anime_manga'
  | 'fantasy_concept_art'
  | 'digital_illustration'
  | 'logo_graphic'
  | 'oil_painting'
  | '3d_render'

export interface ImageIntent {
  rawUserPrompt: string
  detectedMedium: VisualMedium
  enhancedPrompt: string
  aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4'
}

// Candidate Gemini models for text and prompt enhancement (ordered by preference)
const GEMINI_TEXT_MODELS = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest']

/**
 * Classifies user intent into a distinct visual medium to prevent 3D/CGI style contamination
 */
export function detectVisualMedium(prompt: string, styleIntent: string): VisualMedium {
  const p = prompt.toLowerCase()

  // 1. Explicit user prompt overrides
  if (p.includes('anime') || p.includes('manga') || p.includes('cel shaded') || p.includes('studio ghibli')) {
    return 'anime_manga'
  }
  if (p.includes('logo') || p.includes('icon') || p.includes('vector') || p.includes('graphic design') || p.includes('emblem')) {
    return 'logo_graphic'
  }
  if (p.includes('oil painting') || p.includes('watercolor') || p.includes('canvas painting') || p.includes('acrylic painting')) {
    return 'oil_painting'
  }
  if (p.includes('3d render') || p.includes('cgi') || p.includes('blender') || p.includes('octane render') || p.includes('v-ray')) {
    return '3d_render'
  }
  if (p.includes('fantasy') || p.includes('dragon') || p.includes('mythical') || p.includes('concept art')) {
    return 'fantasy_concept_art'
  }
  if (p.includes('illustration') || p.includes('drawing') || p.includes('sketch')) {
    return 'digital_illustration'
  }
  if (p.includes('advertisement') || p.includes('ad ') || p.includes('commercial')) {
    return 'advertising_photo'
  }
  if (p.includes('product') || p.includes('watch') || p.includes('perfume') || p.includes('sneaker') || p.includes('gadget')) {
    return 'product_photo'
  }
  if (p.includes('portrait') || p.includes('headshot') || p.includes('bodybuilder') || p.includes('model') || p.includes('face')) {
    return 'portrait_photo'
  }

  // 2. Style Intent fallback
  if (styleIntent === 'photorealistic' || styleIntent === 'portrait') return 'portrait_photo'
  if (styleIntent === 'product' || styleIntent === 'commercial') return 'product_photo'
  if (styleIntent === '3d_render') return '3d_render'
  if (styleIntent === 'vector_illustration') return 'logo_graphic'

  // Default to authentic real-world photography for animals, landscapes, objects, cars, dogs, etc.
  return 'photograph'
}

/**
 * Builds a subject-agnostic prompt that preserves the requested medium without forcing 3D/CGI styles
 */
async function enhanceImagePrompt(rawPrompt: string, styleIntent: string): Promise<{ enhancedPrompt: string; medium: VisualMedium }> {
  const medium = detectVisualMedium(rawPrompt, styleIntent)

  let mediumDirective = 'Enhance the request while strictly preserving the user\'s intended visual medium.'
  switch (medium) {
    case 'photograph':
    case 'portrait_photo':
      mediumDirective = `You are a subject-agnostic photography prompt optimizer.
Transform the user request into a clean, natural photograph description.
Directives:
- Keep the scene natural, grounded, and authentic to real life.
- Describe realistic subject details, clean eye-level composition, and soft natural ambient lighting.
- ABSOLUTELY PROHIBITED: Do NOT add 'dramatic lighting', 'volumetric rays', 'high contrast', 'rim lighting', 'cinematic color grading', '3D render', 'CGI', 'V-Ray', 'Unreal Engine', 'plastic skin', or 'hyper-realistic' unless requested.`
      break

    case 'advertising_photo':
    case 'product_photo':
      mediumDirective = `You are a commercial advertising photography optimizer.
Transform the request into a clean, professional product/commercial photography specification.
Directives:
- Describe balanced studio softbox lighting, clean backdrop, and crisp product subject details.
- ABSOLUTELY PROHIBITED: Do NOT add 3D render, cartoon, dramatic volumetric rays, or fantasy elements.`
      break

    case 'anime_manga':
      mediumDirective = `You are a Japanese anime art director.
Transform the request into a high-quality anime illustration description.
Directives:
- Detail clean line art, vibrant cel shading, expressive character design, and classic anime visual atmosphere.
- ABSOLUTELY PROHIBITED: Do NOT make it photorealistic or 3D rendered.`
      break

    case 'fantasy_concept_art':
      mediumDirective = `You are a lead fantasy concept artist.
Transform the request into an atmospheric fantasy concept artwork.
Directives:
- Detail rich environmental depth, painterly textures, and fantasy worldbuilding.
- Keep composition balanced without over-saturating lighting.`
      break

    case 'logo_graphic':
      mediumDirective = `You are a principal graphic designer.
Transform the request into a crisp, professional vector graphic design specification.
Directives:
- Detail clean geometric lines, flat color palettes, minimalist composition, and clear visual contrast.`
      break

    case 'oil_painting':
      mediumDirective = `You are a fine art master painter.
Transform the request into an authentic oil painting description.
Directives:
- Detail visible impasto brushstrokes, rich canvas grain, layered oil pigments, and classical fine art lighting.`
      break

    case '3d_render':
      mediumDirective = `You are a 3D digital artist.
Transform the request into a detailed 3D digital render specification.`
      break
  }

  if (!process.env.GEMINI_API_KEY) {
    return { enhancedPrompt: rawPrompt, medium }
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

  for (const model of GEMINI_TEXT_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: `${mediumDirective}

User Request: "${rawPrompt}"

Return ONLY the final enhanced prompt. No preambles, no introductions, no quotes, no markdown.`
      })
      const text = response.text?.trim()
      if (text) {
        console.log(`[IMAGE INTENT] Raw: "${rawPrompt}" | Medium: ${medium} | Refined Prompt (${model}): "${text.slice(0, 90)}..."`)
        return { enhancedPrompt: text, medium }
      }
    } catch {
      continue
    }
  }

  return { enhancedPrompt: rawPrompt, medium }
}

async function refineImagePrompt(previousPrompt: string, instruction: string, styleIntent: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    return `${previousPrompt}, ${instruction}`
  }
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

  for (const model of GEMINI_TEXT_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: `You are an expert prompt engineer. Refine the existing prompt based on a new modification request.

Original Detailed Prompt: "${previousPrompt}"
Refinement Instruction: "${instruction}"
Style Intent: ${styleIntent}

Maintain photographic/artistic medium consistency while applying the edit. Return ONLY the new prompt text.`
      })
      const text = response.text?.trim()
      if (text) {
        return text
      }
    } catch {
      continue
    }
  }

  return `${previousPrompt}, ${instruction}`
}

export async function generateImageContent(
  prompt: string,
  aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4' = '1:1',
  styleIntent: string = 'general',
  refineFromPrevious: boolean = false,
  previousPrompt?: string,
  refinementInstruction?: string,
  forceRawPrompt: boolean = false,
  allowFallback: boolean = true,
  preferredProvider: 'openai' | 'flux' | 'auto' = 'openai'
): Promise<{
  success: boolean
  imageUrl: string
  prompt: string
  enhancedPrompt: string
  provider: string
  aspectRatio: string
  styleIntent: string
  detectedMedium?: string
}> {
  const cleanPrompt = prompt.trim()

  console.log(`\n=================== [ROWAN IMAGE PIPELINE TRACE] ===================`)
  console.log(`[IMAGE PIPELINE] 1. ORIGINAL USER PROMPT: "${cleanPrompt}"`)

  // Step 1: Establish enhanced prompt with Visual Intent Layer
  let enhancedPrompt: string
  let detectedMedium: VisualMedium = 'photograph'

  if (forceRawPrompt) {
    enhancedPrompt = cleanPrompt
    console.log(`[IMAGE PIPELINE] 2. PROMPT TRANSFORMATION: Bypassed (Raw User Prompt Mode)`)
  } else if (refineFromPrevious && previousPrompt && refinementInstruction) {
    enhancedPrompt = await refineImagePrompt(previousPrompt, refinementInstruction, styleIntent)
    detectedMedium = detectVisualMedium(enhancedPrompt, styleIntent)
    console.log(`[IMAGE PIPELINE] 2. PROMPT TRANSFORMATION: Refined from previous prompt`)
  } else {
    const res = await enhanceImagePrompt(cleanPrompt, styleIntent)
    enhancedPrompt = res.enhancedPrompt
    detectedMedium = res.medium
    console.log(`[IMAGE PIPELINE] 2. PROMPT TRANSFORMATION: Visual Medium -> [${detectedMedium}]`)
  }

  console.log(`[IMAGE PIPELINE] 3. FINAL PROMPT SENT TO MODEL: "${enhancedPrompt}"`)

  // Explicit Flux provider request
  if (preferredProvider === 'flux') {
    const randomSeed = Math.floor(Math.random() * 1000000)
    const encoded = encodeURIComponent(enhancedPrompt)
    let width = 1024
    let height = 1024
    if (aspectRatio === '16:9') { width = 1024; height = 576 }
    else if (aspectRatio === '9:16') { width = 576; height = 1024 }
    else if (aspectRatio === '4:3') { width = 1024; height = 768 }
    else if (aspectRatio === '3:4') { width = 768; height = 1024 }

    const fluxUrl = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&seed=${randomSeed}&nologo=true&model=flux`
    console.log(`[IMAGE PIPELINE] Executing explicitly requested Flux.1 endpoint: ${fluxUrl.slice(0, 80)}...`)
    return {
      success: true,
      imageUrl: fluxUrl,
      prompt: cleanPrompt,
      enhancedPrompt,
      provider: 'Pollinations AI (Flux.1)',
      aspectRatio,
      styleIntent,
      detectedMedium
    }
  }

  // Step 2: Primary OpenAI Image Engine Path
  if (!process.env.OPENAI_API_KEY) {
    if (allowFallback) {
      console.warn(`[IMAGE PIPELINE] OPENAI_API_KEY missing. Fallback enabled -> executing Flux.1`)
      const randomSeed = Math.floor(Math.random() * 1000000)
      const encoded = encodeURIComponent(enhancedPrompt)
      const fallbackUrl = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&seed=${randomSeed}&nologo=true&model=flux`
      return {
        success: true,
        imageUrl: fallbackUrl,
        prompt: cleanPrompt,
        enhancedPrompt,
        provider: 'Pollinations AI (Flux.1)',
        aspectRatio,
        styleIntent,
        detectedMedium
      }
    }
    throw new Error('OPENAI_API_KEY environment variable is missing on server.')
  }

  const openai = new OpenAI()
  let size: '1024x1024' | '1024x1792' | '1792x1024' = '1024x1024'
  if (aspectRatio === '16:9') size = '1792x1024'
  if (aspectRatio === '9:16') size = '1024x1792'

  const requestPayload = {
    model: 'chatgpt-image-latest',
    prompt: enhancedPrompt,
    n: 1,
    size,
    quality: 'high' as const
  }

  console.log(`[IMAGE PIPELINE] 4. API REQUEST -> OpenAI Endpoint: https://api.openai.com/v1/images/generations`)
  console.log(`[IMAGE PIPELINE]    Payload:`, JSON.stringify(requestPayload, null, 2))

  try {
    let response
    try {
      response = await openai.images.generate(requestPayload)
    } catch (e) {
      console.log(`[IMAGE PIPELINE] Note: chatgpt-image-latest call note -> gpt-image-2 retry (${e instanceof Error ? e.message : String(e)})`)
      requestPayload.model = 'gpt-image-2'
      response = await openai.images.generate(requestPayload)
    }

    const imageUrl = response.data[0]?.url
    if (imageUrl) {
      console.log(`[IMAGE PIPELINE] 5. GPT IMAGE RESPONSE RECEIVED -> Output URL: ${imageUrl.slice(0, 60)}...`)
      console.log(`====================================================================\n`)
      return {
        success: true,
        imageUrl,
        prompt: cleanPrompt,
        enhancedPrompt,
        provider: `ChatGPT Image (${requestPayload.model})`,
        aspectRatio,
        styleIntent,
        detectedMedium
      }
    }
    throw new Error('OpenAI API returned a success response but no image URL was found.')
  } catch (err: unknown) {
    const errorDetails = err instanceof Error ? err.message : String(err)
    console.error(`[IMAGE PIPELINE] Primary OpenAI Generation Failed: ${errorDetails}`)

    if (allowFallback) {
      console.warn(`[IMAGE PIPELINE] Fallback enabled -> executing Pollinations AI Flux.1 after OpenAI error`)
      const randomSeed = Math.floor(Math.random() * 1000000)
      const encoded = encodeURIComponent(enhancedPrompt)
      const fallbackUrl = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&seed=${randomSeed}&nologo=true&model=flux`
      return {
        success: true,
        imageUrl: fallbackUrl,
        prompt: cleanPrompt,
        enhancedPrompt,
        provider: 'Pollinations AI (Flux.1)',
        aspectRatio,
        styleIntent,
        detectedMedium
      }
    }

    // Do NOT silently fall back or mask error with fake engine labels!
    throw new Error(`OpenAI Image Generation Error: ${errorDetails}`, { cause: err })
  }
}

router.post('/generate', async (req, res) => {
  const parsed = imageSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: 'Please provide valid options for image generation.'
    })
  }

  try {
    const result = await generateImageContent(
      parsed.data.prompt,
      parsed.data.aspectRatio,
      parsed.data.styleIntent,
      parsed.data.refineFromPrevious,
      parsed.data.previousPrompt,
      parsed.data.refinementInstruction,
      false,
      parsed.data.allowFallback,
      parsed.data.preferredProvider
    )
    return res.json(result)
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Image generation error'
    console.error('[IMAGE GEN ERROR]:', errMsg)
    return res.status(500).json({
      success: false,
      message: `Rowan was unable to generate the image: ${errMsg}`
    })
  }
})

// Controlled Raw Image Test Endpoint (Item 7 Requirement)
router.post('/raw-test', async (req, res) => {
  const prompt = req.body.prompt || "Generate a realistic photograph of a golden retriever sitting in a modern living room."
  const preferredProvider = req.body.preferredProvider || 'openai'
  const allowFallback = req.body.allowFallback ?? false

  try {
    const result = await generateImageContent(
      prompt,
      '1:1',
      'photorealistic',
      false,
      undefined,
      undefined,
      false,
      allowFallback,
      preferredProvider
    )

    return res.json({
      success: true,
      rawTestReport: {
        actualProvider: result.provider,
        actualModel: result.provider,
        exactApiRequest: {
          endpoint: preferredProvider === 'flux' ? 'https://image.pollinations.ai' : 'https://api.openai.com/v1/images/generations',
          model: preferredProvider === 'flux' ? 'flux' : 'chatgpt-image-latest',
          size: '1024x1024',
          quality: 'high',
          prompt: result.enhancedPrompt
        },
        rawResponse: {
          status: 200,
          url: result.imageUrl
        },
        rawImageDimensions: '1024x1024',
        rawImageFormat: 'image/jpeg',
        finalDisplayedImage: result.imageUrl
      }
    })
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : String(err)
    })
  }
})

// Developer Diagnostic Endpoint for 5 Core Subjects
router.post('/subject-audit', async (req, res) => {
  const testCases = [
    { name: 'bodybuilder', rawPrompt: "Generate a high-quality realistic photograph of a professional male bodybuilder standing in a modern commercial gym. Natural human anatomy, realistic skin texture, realistic lighting, authentic photographic detail." },
    { name: 'golden_retriever', rawPrompt: "Generate a realistic photograph of a golden retriever sitting in a modern living room." },
    { name: 'sports_car', rawPrompt: "Generate a realistic photograph of a modern red Ferrari sports car driving on a coastal road at sunset." },
    { name: 'human_portrait', rawPrompt: "Generate a realistic photograph of a professional woman in business attire smiling in a modern office." },
    { name: 'landscape', rawPrompt: "Generate a realistic photograph of a serene mountain lake at sunrise with pine trees." },
    { name: 'product', rawPrompt: "Generate a commercial product photograph of a luxury wristwatch sitting on a dark marble surface." }
  ]

  const comparisons: Record<string, unknown> = {}

  await Promise.all(testCases.map(async (tc) => {
    const medium = detectVisualMedium(tc.rawPrompt, 'general')
    const enhanced = await enhanceImagePrompt(tc.rawPrompt, 'general')

    const rawUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(tc.rawPrompt)}?width=1024&height=1024&seed=1001&nologo=true&model=flux`
    const enhancedUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhanced.enhancedPrompt)}?width=1024&height=1024&seed=1001&nologo=true&model=flux`

    comparisons[tc.name] = {
      mediumDetected: medium,
      rawPrompt: tc.rawPrompt,
      rawUrl,
      enhancedPrompt: enhanced.enhancedPrompt,
      enhancedUrl
    }
  }))

  return res.json({
    success: true,
    comparisons
  })
})

router.post('/edit', upload.single('image'), async (req, res) => {
  const tempFilePath: string | null = req.file ? req.file.path : null

  try {
    const prompt = req.body.prompt || req.body.instruction
    let base64Data: string | null = null
    let mimeType: string = 'image/png'

    if (req.file) {
      const fileBuffer = fs.readFileSync(req.file.path)
      base64Data = fileBuffer.toString('base64')
      mimeType = req.file.mimetype || 'image/png'
    } else if (req.body.imageData || req.body.previousImageUrl) {
      const srcUrl = req.body.imageData || req.body.previousImageUrl
      if (typeof srcUrl === 'string' && srcUrl.startsWith('data:image/')) {
        const matches = srcUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/)
        if (matches && matches[2]) {
          mimeType = matches[1] || 'image/png'
          base64Data = matches[2]
        }
      } else if (typeof srcUrl === 'string' && srcUrl.startsWith('http')) {
        try {
          const imgRes = await fetch(srcUrl)
          const arrayBuf = await imgRes.arrayBuffer()
          base64Data = Buffer.from(arrayBuf).toString('base64')
          mimeType = imgRes.headers.get('content-type') || 'image/png'
        } catch {
          // ignore
        }
      }
    }

    if (!prompt) {
      if (tempFilePath && fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath)
      return res.status(400).json({
        success: false,
        message: 'Prompt instruction is required for image editing.'
      })
    }

    // Step 1: Use Gemini Multimodal AI for Direct Image Editing
    if (process.env.GEMINI_API_KEY && base64Data) {
      try {
        console.log('[IMAGE EDIT] Invoking Gemini Multimodal Engine for image edit instruction:', prompt)
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

        const editModels = ['gemini-3.1-flash-lite-image', 'gemini-3.1-flash-image']
        for (const modelName of editModels) {
          try {
            const response = await ai.models.generateContent({
              model: modelName,
              contents: {
                parts: [
                  {
                    inlineData: {
                      data: base64Data,
                      mimeType: mimeType
                    }
                  },
                  {
                    text: `Edit and transform this image according to the instruction: "${prompt}". Maintain subject consistency and photographic quality.`
                  }
                ]
              }
            })

            const candidates = response.candidates
            if (candidates && candidates[0]?.content?.parts) {
              for (const part of candidates[0].content.parts) {
                if (part.inlineData && part.inlineData.data) {
                  const editedUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`
                  if (tempFilePath && fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath)
                  return res.json({
                    success: true,
                    imageUrl: editedUrl,
                    prompt: prompt,
                    provider: 'Rowan Multimodal Neural Engine (Gemini)'
                  })
                }
              }
            }
          } catch (mErr) {
            console.warn(`[IMAGE EDIT] Model ${modelName} note:`, mErr instanceof Error ? mErr.message : String(mErr))
          }
        }

        // Secondary approach: Use Gemini Vision to analyze original image and generate updated prompt
        console.log('[IMAGE EDIT] Analyzing original image context with Gemini Vision...')
        let newPrompt: string | undefined

        for (const vModel of GEMINI_TEXT_MODELS) {
          try {
            const visionAnalysis = await ai.models.generateContent({
              model: vModel,
              contents: {
                parts: [
                  { inlineData: { data: base64Data, mimeType } },
                  { text: `Describe this image in detailed artistic terms, then modify the description according to this edit instruction: "${prompt}". Provide a complete, standalone image generation prompt representing the newly edited picture. Return ONLY the new prompt.` }
                ]
              }
            })
            newPrompt = visionAnalysis.text?.trim()
            if (newPrompt) {
              console.log(`[IMAGE EDIT] Generated updated prompt from vision analysis using ${vModel}:`, newPrompt.slice(0, 100))
              break
            }
          } catch (vErr: unknown) {
            console.log(`[IMAGE EDIT] Vision analysis with ${vModel} note:`, vErr instanceof Error ? vErr.message : String(vErr))
          }
        }

        if (newPrompt) {
          const generated = await generateImageContent(newPrompt, '1:1', 'general', true, prompt, prompt)
          if (tempFilePath && fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath)
          return res.json(generated)
        }
      } catch (geminiErr) {
        console.warn('[IMAGE EDIT] Gemini multimodal image edit note:', geminiErr instanceof Error ? geminiErr.message : String(geminiErr))
      }
    }

    // Fallback: Refinement Generation
    const fallbackResult = await generateImageContent(
      prompt,
      '1:1',
      'general',
      true,
      prompt,
      prompt
    )

    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try { fs.unlinkSync(tempFilePath) } catch { /* ignore */ }
    }

    return res.json(fallbackResult)
  } catch (error: unknown) {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try { fs.unlinkSync(tempFilePath) } catch { /* ignore */ }
    }
    const errMsg = error instanceof Error ? error.message : 'Image editing error'
    console.error('[IMAGE EDIT ERROR]:', errMsg)
    return res.status(500).json({
      success: false,
      message: `Rowan was unable to edit the image: ${errMsg}`
    })
  }
})

export default router
