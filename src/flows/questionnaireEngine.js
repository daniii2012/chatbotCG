/**
 * Avanza un cuestionario largo pregunta por pregunta.
 * Guarda cada respuesta bajo su "key" en session.data.
 * Soporta validación opcional por pregunta (validate + errorMsg).
 *
 * @param session - sesión activa
 * @param userMessage - respuesta del usuario (null si es la primera llamada)
 * @param preguntas - array [{ key, texto, validate?, errorMsg? }]
 * @param indexField - nombre del campo en data donde se guarda el progreso
 *                      (usa uno distinto por cuestionario, ej. 'socioIndex', 'legalIndex', 'empIndex')
 * @returns { response, finished }
 */
function runQuestionnaire(session, userMessage, preguntas, indexField) {
  const { data } = session;
  const idx = data[indexField] ?? 0;

  if (idx > 0) {
    const preguntaAnterior = preguntas[idx - 1];

    if (preguntaAnterior.validate && !preguntaAnterior.validate(userMessage)) {
      const errorMsg = preguntaAnterior.errorMsg || '⚠️ Esa respuesta no parece válida, intenta de nuevo.';
      return { response: errorMsg + '\n\n' + preguntaAnterior.texto, finished: false };
    }

    data[preguntaAnterior.key] = userMessage;
  }

  if (idx < preguntas.length) {
    data[indexField] = idx + 1;
    return { response: preguntas[idx].texto, finished: false };
  }

  delete data[indexField];
  return { response: null, finished: true };
}

module.exports = { runQuestionnaire };
