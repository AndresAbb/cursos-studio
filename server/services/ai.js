// Generación de exámenes con OpenAI o Anthropic
// Las keys se almacenan en .env (OPENAI_API_KEY, ANTHROPIC_API_KEY)

const OPENAI_KEY = process.env.OPENAI_API_KEY || '';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';

const SYSTEM_PROMPT = `Eres un creador de exámenes educativos. Generas exámenes en formato Markdown con preguntas claras, numeradas, y respuestas esperadas comentadas al final (en una sección "Clave de respuestas" oculta tras un separador).

Estructura del output:

# {título del examen}

_Tiempo: {minutos} min · {N} preguntas · Total: {N} puntos_

---

## Pregunta 1 (X pts)
{enunciado}

[A] opción
[B] opción
[C] opción
[D] opción

(repetir para todas las preguntas, mezclando opción múltiple con respuesta corta cuando aplique)

---

## Clave de respuestas

1. {respuesta} — {breve justificación}
2. ...

Reglas:
- Sin saludos ni preámbulos. Empieza directo con el "# título".
- Idioma del examen: el del prompt del usuario.
- Distribuir puntos para que sumen exactamente "Total".`;

function getKey(provider) {
  if (provider === 'openai') return OPENAI_KEY;
  if (provider === 'anthropic') return ANTHROPIC_KEY;
  return '';
}

function isConfigured(provider) {
  return !!getKey(provider);
}

function buildUserPrompt({ topic, questionCount, timeLimit }) {
  return `Genera un examen sobre el siguiente tema:

${topic}

Especificaciones:
- Cantidad de preguntas: ${questionCount}
- Tiempo límite: ${timeLimit} minutos
- Total de puntos: ${questionCount * 10}
- Combina opción múltiple (60%) con preguntas abiertas cortas (40%).
- Dificultad progresiva: las primeras más fáciles, las últimas más retadoras.`;
}

async function generateOpenAI({ topic, questionCount, timeLimit, model }) {
  if (!OPENAI_KEY) throw new Error('OPENAI_API_KEY no configurada');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: buildUserPrompt({ topic, questionCount, timeLimit }) },
      ],
      temperature: 0.7,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${err.slice(0, 300)}`);
  }
  const json = await res.json();
  return json.choices?.[0]?.message?.content || '';
}

async function generateAnthropic({ topic, questionCount, timeLimit, model }) {
  if (!ANTHROPIC_KEY) throw new Error('ANTHROPIC_API_KEY no configurada');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model || 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: buildUserPrompt({ topic, questionCount, timeLimit }) },
      ],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic error ${res.status}: ${err.slice(0, 300)}`);
  }
  const json = await res.json();
  return json.content?.[0]?.text || '';
}

async function generateExam({ provider, topic, questionCount = 10, timeLimit = 30, model }) {
  if (provider === 'openai')   return generateOpenAI({ topic, questionCount, timeLimit, model });
  if (provider === 'anthropic') return generateAnthropic({ topic, questionCount, timeLimit, model });
  throw new Error(`Proveedor "${provider}" no soportado o sin configurar`);
}

function maskedKey(provider) {
  const k = getKey(provider);
  if (!k) return '';
  return '•••' + k.slice(-4);
}

module.exports = { generateExam, isConfigured, maskedKey };
