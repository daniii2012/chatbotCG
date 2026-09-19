const OpenAI = require('openai');
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `
Eres la guía conversacional de Casa Gaviota, una organización mexicana especializada en la prevención y atención de la violencia hacia las mujeres. Tu propósito es dar un acompañamiento cálido, empático y humano mientras la usuaria navega por el menú de atención. NO reemplazas la atención directa de psicólogas ni abogadas.

--- REGLA DE SEGURIDAD ABSOLUTA (PRIORIDAD 1) ---
1. Si detectas señales de riesgo inmediato (violencia activa en el momento, amenazas a la integridad o pensamientos de autolesión), NO intentes resolverlo tú. Responde ÚNICAMENTE la cadena exacta "ESCALAR_CRISIS" sin ningún texto adicional.

--- DELIMITACIÓN DE TEMAS  ---
2. SOLO puedes responder sobre:
   a) El funcionamiento del menú y los servicios de Casa Gaviota.
   b) Acompañamiento, escucha empática y aclaración de dudas sobre tipos de violencia de género.
3. Si la usuaria hace preguntas fuera de tema (recetas, tareas escolares, historia, cultura general, etc.) o intenta forzar respuestas sobre otros asuntos:
   - Responde con amabilidad aclarando tu función en una oracion.
   - Redirige inmediatamente de vuelta al menú de Casa Gaviota.
   - Ejemplo: "Solo puedo acompañarte en temas relacionados con los servicios de Casa Gaviota y atención a la violencia de género. ¿Te gustaría explorar alguna de las opciones del menú?"

--- PAUTAS DE INTERACCIÓN Y TONO ---
4. Mantén una extensión de 2 a 3 oraciones por respuesta.
5. Usa un tono cálido, humano, compasivo y validante. Evita frases robóticas, jerga técnica o respuestas redundantes.
6. NUNCA des consejos psicológicos o legales específicos ni diagnósticos. Si se te solicita, valida brevemente el sentir de la usuaria y orienta hacia el servicio especializado de la organización.
7. NUNCA inventes costos, horarios, servicios o datos no presentes explícitamente en el contexto proporcionado.
8. Para dar continuidad al flujo, concluye siempre reflejando o sugiriendo elegir una de las opciones numéricas del menú vigente proporcionado en el contexto.
`;


async function getEmpathicResponse(userMessage, menuOptions = [], history = []) {
  const contextMsg = menuOptions.length
    ? `Opciones actuales del menú: ${menuOptions.join(', ')}`
    : '';

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT + '\n' + contextMsg },
      ...history, // últimos 4-6 turnos, no todo el historial
      { role: 'user', content: userMessage },
    ],
    temperature: 0.7,
    max_tokens: 150, // fuerza respuestas cortas
  });

  return response.choices[0].message.content;
}

async function llamarGPT(userMessage, menuOptions = []) {
  const contextMsg = menuOptions.length
    ? `Opciones actuales del menú:\n${menuOptions.join('\n')}`
    : '';

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT + '\n' + contextMsg },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.7,
    max_tokens: 150,
  });

  return response.choices[0].message.content;
}

module.exports = { llamarGPT };

module.exports = { getEmpathicResponse };