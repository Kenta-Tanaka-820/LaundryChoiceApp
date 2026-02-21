#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');

const API_URL = 'https://api.openai.com/v1/responses';
const SUPPORTED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tiff']);
const MATERIALS = ['delicate', 'synthetic', 'cotton', 'unknown'];

async function loadDotEnv(projectRoot) {
  const envPath = path.join(projectRoot, '.env');
  let content;

  try {
    content = await fs.readFile(envPath, 'utf8');
  } catch (error) {
    if (error && error.code === 'ENOENT') return;
    throw error;
  }

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const equalIndex = line.indexOf('=');
    if (equalIndex <= 0) continue;

    const key = line.slice(0, equalIndex).trim();
    let value = line.slice(equalIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function getMimeType(ext) {
  const normalized = ext.toLowerCase();
  if (normalized === '.jpg' || normalized === '.jpeg') return 'image/jpeg';
  if (normalized === '.png') return 'image/png';
  if (normalized === '.webp') return 'image/webp';
  if (normalized === '.gif') return 'image/gif';
  if (normalized === '.bmp') return 'image/bmp';
  if (normalized === '.tiff') return 'image/tiff';
  return 'application/octet-stream';
}

async function findFirstImageFile(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((fileName) => SUPPORTED_EXTENSIONS.has(path.extname(fileName).toLowerCase()))
    .sort();

  if (files.length === 0) {
    throw new Error(`No image file found in ${dirPath}. Put an image in scripts/ and run again.`);
  }

  return path.join(dirPath, files[0]);
}

function extractTextFromResponse(result) {
  if (typeof result.output_text === 'string' && result.output_text.trim()) {
    return result.output_text.trim();
  }

  if (!Array.isArray(result.output)) return '';

  const textParts = [];
  for (const item of result.output) {
    if (!item || !Array.isArray(item.content)) continue;
    for (const contentItem of item.content) {
      if (contentItem && contentItem.type === 'output_text' && typeof contentItem.text === 'string') {
        textParts.push(contentItem.text);
      }
    }
  }

  return textParts.join('\n').trim();
}

async function main() {
  await loadDotEnv(path.resolve(__dirname, '..'));

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set. Put OPENAI_API_KEY=sk-... in .env or set it in your shell.');
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
  const scriptDir = __dirname;
  const argPath = process.argv[2] ? path.resolve(process.argv[2]) : null;
  const imagePath = argPath || (await findFirstImageFile(scriptDir));

  const ext = path.extname(imagePath);
  if (!SUPPORTED_EXTENSIONS.has(ext.toLowerCase())) {
    throw new Error(`Unsupported image type: ${ext}`);
  }

  const imageBuffer = await fs.readFile(imagePath);
  const imageBase64 = imageBuffer.toString('base64');
  const mimeType = getMimeType(ext);

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text:
                'Classify the clothing material category from this label image. ' +
                'Use only these categories: delicate, synthetic, cotton, unknown. ' +
                'Keyword rules: delicate=[ウール,毛,羊毛,wool,シルク,絹,silk,レーヨン,rayon,カシミヤ,cashmere], ' +
                'synthetic=[ポリエステル,ポリエ,ポリ,polyester,ナイロン,nylon,アクリル,acrylic,ポリウレタン,polyurethane,spandex,elastane,pu], ' +
                'cotton=[綿,コットン,cotton]. ' +
                'Return JSON only in the format: {"material":"<category>"}'
            },
            {
              type: 'input_image',
              image_url: `data:${mimeType};base64,${imageBase64}`
            }
          ]
        }
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'material_result',
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              material: {
                type: 'string',
                enum: MATERIALS
              }
            },
            required: ['material']
          }
        }
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errText}`);
  }

  const result = await response.json();
  const text = extractTextFromResponse(result);

  if (!text) {
    throw new Error('OCR text could not be extracted from response payload.');
  }

  const parsed = JSON.parse(text);
  if (!parsed || !MATERIALS.includes(parsed.material)) {
    throw new Error('Invalid JSON result. Expected {"material":"delicate|synthetic|cotton|unknown"}');
  }

  console.log(parsed.material);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
