// ── Exam prompt templates ──────────────────────────────────────────────────
// Placeholders: {courseTitle} {moduleList} {questionCount} {timeLimit}
//
// ESTRUCTURA COMÚN: Todas las plantillas usan SECCIONES (A, B, C…) con
// PREGUNTAS numeradas (1, 2, 3…) dentro de cada sección. Las respuestas se
// referencian como A1, A2, B1, B2… para fácil tabulación.
//
// REGLA DE FORMATO GLOBAL (incluida en cada prompt):
//   Sin cursiva ni itálica en ninguna parte del examen.
const _FMT_RULE = `
REGLA DE FORMATO OBLIGATORIA:
- Sin cursiva ni itálica: no usar asterisco simple (*texto*) ni guion bajo (_texto_) para énfasis.
- Solo usar **negrita** para encabezados de sección y etiquetas de pregunta.
- Las preguntas se organizan en SECCIONES etiquetadas con letras mayúsculas (A, B, C…).
- Dentro de cada sección las preguntas se numeran (1, 2, 3…).
- Las opciones de opción múltiple usan letras minúsculas: a) b) c) d).
- La clave/rúbrica usa notación SECCIÓN+NÚMERO: A1, A2, B1, B2…`;

const EXAM_TEMPLATES = {
  'multiple-choice': {
    introductory: `Genera un examen de opción múltiple INTRODUCTORIO para el curso "{courseTitle}".

Contenidos evaluados:
{moduleList}

Especificaciones:
- {questionCount} preguntas de opción múltiple, 4 opciones cada una
- Nivel cognitivo: Recordar y Comprender (Bloom niveles 1-2)
- Dificultad baja: vocabulario accesible, conceptos fundamentales
- Tiempo estimado: {timeLimit} minutos
${_FMT_RULE}

Estructura del documento:

**SECCIÓN A — Opción Múltiple** ({questionCount} preguntas)

1. [Enunciado claro y conciso]
   a) [opción]   b) [opción]   c) [opción]   d) [opción]

2. [Enunciado]
   a) …   b) …   c) …   d) …

(continuar hasta completar {questionCount} preguntas)

---

**CLAVE DE RESPUESTAS**

| Pregunta | Respuesta | Justificación breve |
|----------|-----------|---------------------|
| A1 | [a/b/c/d] | [1 oración] |
| A2 | … | … |`,

    intermediate: `Genera un examen de opción múltiple INTERMEDIO para el curso "{courseTitle}".

Contenidos evaluados:
{moduleList}

Especificaciones:
- {questionCount} preguntas de opción múltiple con escenario o dato
- Nivel cognitivo: Aplicar y Analizar (Bloom niveles 3-4)
- Distractores plausibles que exijan razonamiento, no solo memorización
- Tiempo estimado: {timeLimit} minutos
${_FMT_RULE}

Estructura del documento:

**SECCIÓN A — Opción Múltiple Aplicada** ({questionCount} preguntas)

1. [Escenario breve o dato]. ¿Cuál afirmación es correcta?
   a) …   b) …   c) …   d) …

(continuar hasta {questionCount} preguntas)

---

**CLAVE DE RESPUESTAS**

| Pregunta | Respuesta | Concepto evaluado |
|----------|-----------|-------------------|
| A1 | [a/b/c/d] | [concepto relevante] |
| A2 | … | … |`,

    advanced: `Genera un examen de opción múltiple AVANZADO para el curso "{courseTitle}".

Contenidos evaluados:
{moduleList}

Especificaciones:
- {questionCount} preguntas con dilema o escenario realista
- Nivel cognitivo: Evaluar (Bloom nivel 5)
- Distractores basados en errores conceptuales de nivel experto
- Cada pregunta exige juicio crítico o evaluación de evidencia
- Tiempo estimado: {timeLimit} minutos
${_FMT_RULE}

Estructura del documento:

**SECCIÓN A — Evaluación Crítica** ({questionCount} preguntas)

1. [Dilema o escenario complejo]. La opción que mejor evalúa la situación es:
   a) …   b) …   c) …   d) …

(continuar hasta {questionCount} preguntas)

---

**CLAVE DE RESPUESTAS**

| Pregunta | Respuesta | Por qué las otras opciones son incorrectas |
|----------|-----------|--------------------------------------------|
| A1 | [a/b/c/d] | [justificación diferencial] |
| A2 | … | … |`,

    expert: `Genera un examen de opción múltiple de nivel EXPERTO para el curso "{courseTitle}".

Contenidos evaluados:
{moduleList}

Especificaciones:
- {questionCount} preguntas de síntesis y construcción mental de sistemas
- Nivel cognitivo: Crear (Bloom nivel 6)
- Escenarios de alta complejidad que integran múltiples conceptos del curso
- Al menos 2 preguntas requieren diseño o cálculo mental
- Tiempo estimado: {timeLimit} minutos
${_FMT_RULE}

Estructura del documento:

**SECCIÓN A — Síntesis y Diseño** ({questionCount} preguntas)

1. [Escenario multi-concepto]. La solución/diseño/síntesis óptima sería:
   a) …   b) …   c) …   d) …

(continuar hasta {questionCount} preguntas)

---

**CLAVE DE RESPUESTAS**

| Pregunta | Respuesta | Razonamiento (2-3 oraciones) |
|----------|-----------|------------------------------|
| A1 | [a/b/c/d] | … |
| A2 | … | … |`,
  },

  'essay': {
    introductory: `Genera un examen de ensayo INTRODUCTORIO para el curso "{courseTitle}".

Contenidos evaluados:
{moduleList}

Especificaciones:
- {questionCount} preguntas de respuesta abierta corta (150-250 palabras cada una)
- Nivel cognitivo: Recordar y Comprender (Bloom niveles 1-2)
- Preguntas que pidan definir, describir o explicar con ejemplos sencillos
- Tiempo estimado: {timeLimit} minutos
${_FMT_RULE}

Estructura del documento:

**SECCIÓN A — Preguntas de Ensayo Corto** ({questionCount} preguntas)

**A1.** [Enunciado: defina, describa o explique con ejemplo]
Guia de respuesta: mencionar X, Y, Z conceptos clave (50-80 palabras de criterio).

**A2.** …

(continuar hasta {questionCount} preguntas)

---

**RÚBRICA — SECCIÓN A** (por pregunta, 4 puntos)

| Criterio | Excelente (4) | Bueno (3) | Regular (2) | Insuficiente (1) |
|----------|--------------|-----------|-------------|-----------------|
| Precisión conceptual | … | … | … | … |
| Uso de ejemplos | … | … | … | … |
| Claridad y coherencia | … | … | … | … |`,

    intermediate: `Genera un examen de ensayo INTERMEDIO para el curso "{courseTitle}".

Contenidos evaluados:
{moduleList}

Especificaciones:
- {questionCount} preguntas de ensayo analítico (250-400 palabras cada una)
- Nivel cognitivo: Aplicar y Analizar (Bloom niveles 3-4)
- Al menos 1 pregunta con datos o escenario para analizar
- Tiempo estimado: {timeLimit} minutos
${_FMT_RULE}

Estructura del documento:

**SECCIÓN A — Análisis y Aplicación** ({questionCount} preguntas)

**A1.** [Enunciado analítico: compare, contraste o aplique a un caso]
Guia de respuesta: …

**A2.** …

(continuar hasta {questionCount} preguntas)

---

**RÚBRICA — SECCIÓN A** (por pregunta, 20 puntos)

| Criterio | Pts | Descripción |
|----------|-----|-------------|
| Tesis clara | 4 | … |
| Análisis con evidencia | 6 | … |
| Aplicación al contexto | 6 | … |
| Estructura y coherencia | 4 | … |`,

    advanced: `Genera un examen de ensayo AVANZADO para el curso "{courseTitle}".

Contenidos evaluados:
{moduleList}

Especificaciones:
- {questionCount} preguntas de ensayo argumentativo (400-600 palabras cada una)
- Nivel cognitivo: Evaluar (Bloom nivel 5)
- El estudiante debe argumentar, refutar o evaluar críticamente
- Al menos 1 pregunta presenta perspectivas contrapuestas
- Tiempo estimado: {timeLimit} minutos
${_FMT_RULE}

Estructura del documento:

**SECCIÓN A — Argumentación Crítica** ({questionCount} preguntas)

**A1.** [Postura o afirmación: ¿Estás de acuerdo? Argumenta con evidencia.]
Perspectivas a considerar: [perspectiva 1] frente a [perspectiva 2].

**A2.** …

(continuar hasta {questionCount} preguntas)

---

**RÚBRICA — SECCIÓN A** (por pregunta, 25 puntos)

| Criterio | Pts | Descripción |
|----------|-----|-------------|
| Claridad de postura | 5 | … |
| Calidad de argumentos | 8 | … |
| Contraargumentación | 7 | … |
| Síntesis y conclusión | 5 | … |`,

    expert: `Genera un examen de ensayo EXPERTO para el curso "{courseTitle}".

Contenidos evaluados:
{moduleList}

Especificaciones:
- {questionCount} ensayos de síntesis e innovación (600-900 palabras cada uno)
- Nivel cognitivo: Crear (Bloom nivel 6)
- El alumno propone, diseña o construye algo nuevo integrando múltiples contenidos
- Al menos 1 pregunta de prospectiva o propuesta de mejora fundamentada
- Tiempo estimado: {timeLimit} minutos
${_FMT_RULE}

Estructura del documento:

**SECCIÓN A — Propuesta y Creación** ({questionCount} preguntas)

**A1.** [Proponer / diseñar / crear basándose en los contenidos del curso]
Entregable esperado: propuesta con fundamentación teórica, aplicación práctica y reflexión crítica.

**A2.** …

(continuar hasta {questionCount} preguntas)

---

**RÚBRICA — SECCIÓN A** (por pregunta, 30 puntos)

| Criterio | Pts | Descripción |
|----------|-----|-------------|
| Originalidad de la propuesta | 8 | … |
| Fundamentación teórica | 8 | … |
| Viabilidad / aplicabilidad | 7 | … |
| Integración de contenidos | 4 | … |
| Presentación y claridad | 3 | … |`,
  },

  'project': {
    introductory: `Genera una guía de proyecto INTRODUCTORIO para el curso "{courseTitle}".

Contenidos que debe integrar:
{moduleList}

Especificaciones:
- Proyecto individual o en parejas
- Nivel cognitivo: Comprender y Aplicar básico (Bloom niveles 2-3)
- Entregable concreto y acotado (informe corto, presentación de 5 slides, mapa conceptual)
- Tiempo de desarrollo estimado: {timeLimit} horas
${_FMT_RULE}

Estructura del documento:

**SECCIÓN A — Descripción del Proyecto**

**A1.** Título del proyecto: …
**A2.** Objetivo general: …
**A3.** Contenidos del curso que debe integrar: …

**SECCIÓN B — Instrucciones y Entregables**

**B1.** Instrucciones paso a paso:
1. … 2. … 3. …
**B2.** Entregables requeridos: [lista numerada]
**B3.** Formato de presentación: …

---

**SECCIÓN C — Rúbrica de Evaluación** (100 pts)

| Criterio | Excelente (90-100) | Bueno (70-89) | Regular (50-69) | Insuficiente (<50) |
|----------|-------------------|--------------|----------------|-------------------|
| Comprensión del tema | … | … | … | … |
| Calidad del entregable | … | … | … | … |
| Presentación | … | … | … | … |`,

    intermediate: `Genera una guía de proyecto INTERMEDIO para el curso "{courseTitle}".

Contenidos que debe integrar:
{moduleList}

Especificaciones:
- Proyecto individual aplicado a un caso real o simulado
- Nivel cognitivo: Aplicar y Analizar (Bloom niveles 3-4)
- Tiempo de desarrollo estimado: {timeLimit} horas
${_FMT_RULE}

Estructura del documento:

**SECCIÓN A — Contexto del Proyecto**

**A1.** Descripción del caso o problema: …
**A2.** Objetivos de aprendizaje: …
**A3.** Restricciones y supuestos del proyecto: …

**SECCIÓN B — Fases y Entregables**

**B1.** Fase 1: …
**B2.** Fase 2: …
**B3.** Fase 3: …
**B4.** Entregables y fechas: …

---

**SECCIÓN C — Rúbrica Analítica** (100 pts)

| Criterio | Pts | Descripción del nivel de excelencia |
|----------|-----|--------------------------------------|
| Aplicación de conceptos | 30 | … |
| Análisis del caso | 30 | … |
| Calidad del entregable | 20 | … |
| Reflexión personal | 20 | … |`,

    advanced: `Genera una guía de proyecto AVANZADO para el curso "{courseTitle}".

Contenidos que debe integrar:
{moduleList}

Especificaciones:
- Proyecto individual con evaluación crítica de alternativas
- Nivel cognitivo: Evaluar (Bloom nivel 5)
- Tiempo de desarrollo estimado: {timeLimit} horas
${_FMT_RULE}

Estructura del documento:

**SECCIÓN A — Definición del Problema**

**A1.** Problema a resolver: …
**A2.** Restricciones y supuestos: …
**A3.** Criterios de éxito de la solución: …

**SECCIÓN B — Desarrollo y Entregables**

**B1.** Análisis de alternativas con criterios de evaluación
**B2.** Solución elegida con justificación fundamentada
**B3.** Reflexión crítica sobre limitaciones y mejoras posibles

---

**SECCIÓN C — Rúbrica Avanzada** (100 pts)

| Criterio | Pts | Indicadores |
|----------|-----|-------------|
| Profundidad del análisis | 35 | … |
| Evaluación de alternativas | 30 | … |
| Fundamentos teóricos | 20 | … |
| Rigor de la reflexión | 15 | … |`,

    expert: `Genera una guía de proyecto EXPERTO para el curso "{courseTitle}".

Contenidos que debe integrar:
{moduleList}

Especificaciones:
- Proyecto de creación e innovación (algo que no existía antes)
- Nivel cognitivo: Crear (Bloom nivel 6)
- Tiempo de desarrollo estimado: {timeLimit} horas
${_FMT_RULE}

Estructura del documento:

**SECCIÓN A — Reto Creativo**

**A1.** Descripción del reto abierto: …
**A2.** Alcance mínimo requerido: …
**A3.** El alumno define el problema específico y la solución dentro del reto.

**SECCIÓN B — Entregables**

**B1.** Propuesta original con fundamentación teórica
**B2.** Prototipo / desarrollo / documento de diseño
**B3.** Autoevaluación crítica del propio trabajo

---

**SECCIÓN C — Rúbrica de Creación** (100 pts)

| Criterio | Pts | Descripción |
|----------|-----|-------------|
| Originalidad e innovación | 30 | … |
| Integración de conocimientos | 25 | … |
| Calidad técnica del entregable | 25 | … |
| Autoevaluación fundamentada | 20 | … |`,
  },

  'mixed': {
    introductory: `Genera un examen mixto INTRODUCTORIO para el curso "{courseTitle}".

Contenidos evaluados:
{moduleList}

Especificaciones:
- {questionCount} ítems en total — Tiempo estimado: {timeLimit} minutos
- Nivel cognitivo: Recordar y Comprender (Bloom niveles 1-2)
- Distribución: 50% opción múltiple / 30% verdadero-falso / 20% respuesta corta
${_FMT_RULE}

Estructura del documento:

**SECCIÓN A — Opción Múltiple** (50% de {questionCount} ítems)

1. [Enunciado]
   a) …   b) …   c) …   d) …

(continuar con todas las preguntas de esta sección)

**SECCIÓN B — Verdadero o Falso** (30% de {questionCount} ítems)

1. [Afirmación] — Verdadero / Falso
   Justificación obligatoria (1 oración): …

**SECCIÓN C — Respuesta Corta** (20% de {questionCount} ítems)

1. [Pregunta de definición o descripción] (50-100 palabras)

---

**CLAVE Y RÚBRICA**

Sección A: A1=[a/b/c/d], A2=…
Sección B: B1=[V/F], B2=…
Sección C: Rúbrica por pregunta — Precisión (2 pts) + Claridad (1 pt)`,

    intermediate: `Genera un examen mixto INTERMEDIO para el curso "{courseTitle}".

Contenidos evaluados:
{moduleList}

Especificaciones:
- {questionCount} ítems en total — Tiempo estimado: {timeLimit} minutos
- Nivel cognitivo: Aplicar y Analizar (Bloom niveles 3-4)
- Distribución: 40% opción múltiple / 35% aplicación práctica / 25% análisis de caso
${_FMT_RULE}

Estructura del documento:

**SECCIÓN A — Opción Múltiple con Escenario** (40% de {questionCount} ítems)

1. [Escenario + pregunta]
   a) …   b) …   c) …   d) …

**SECCIÓN B — Aplicación Práctica** (35% de {questionCount} ítems, 100-200 palabras c/u)

1. [Pregunta de aplicación a situación real]

**SECCIÓN C — Análisis de Caso** (25% de {questionCount} ítems, 200-300 palabras c/u)

1. [Pregunta de análisis sobre el caso presentado]

---

**CLAVE Y RÚBRICA POR SECCIÓN**

Sección A: A1=[a/b/c/d], A2=…
Sección B — Rúbrica (10 pts c/u): Aplicación (4) + Argumentación (4) + Claridad (2)
Sección C — Rúbrica (15 pts c/u): Identificación del problema (5) + Análisis (7) + Conclusión (3)`,

    advanced: `Genera un examen mixto AVANZADO para el curso "{courseTitle}".

Contenidos evaluados:
{moduleList}

Especificaciones:
- {questionCount} ítems en total — Tiempo estimado: {timeLimit} minutos
- Nivel cognitivo: Evaluar (Bloom nivel 5)
- Distribución: 30% opción múltiple crítica / 40% ensayo argumentativo / 30% análisis con postura
${_FMT_RULE}

Estructura del documento:

**SECCIÓN A — Evaluación Crítica** (30% de {questionCount} ítems)

1. [Dilema o trade-off conceptual]
   a) …   b) …   c) …   d) …

**SECCIÓN B — Ensayo Argumentativo** (40% de {questionCount} ítems, 300-400 palabras c/u)

1. [Postura controversial: argumenta a favor o en contra con evidencia del curso]

**SECCIÓN C — Análisis con Toma de Postura** (30% de {questionCount} ítems, 200-300 palabras c/u)

1. [Situación con alternativas: elige, justifica y anticipa objeciones]

---

**CLAVE Y RÚBRICA POR SECCIÓN**

Sección A: A1=[a/b/c/d], A2=…
Sección B — Rúbrica (20 pts): Postura (4) + Argumentos (8) + Contraargumentación (5) + Cierre (3)
Sección C — Rúbrica (15 pts): Elección justificada (6) + Análisis de alternativas (6) + Proyección (3)`,

    expert: `Genera un examen mixto EXPERTO para el curso "{courseTitle}".

Contenidos evaluados:
{moduleList}

Especificaciones:
- {questionCount} ítems en total — Tiempo estimado: {timeLimit} minutos
- Nivel cognitivo: Crear (Bloom nivel 6)
- Distribución: 20% síntesis conceptual / 40% propuesta de solución / 40% diseño integrador
${_FMT_RULE}

Estructura del documento:

**SECCIÓN A — Síntesis Conceptual** (20% de {questionCount} ítems)

1. [Escenario multi-concepto complejo]
   a) …   b) …   c) …   d) …

**SECCIÓN B — Propuesta de Solución** (40% de {questionCount} ítems, 500-700 palabras c/u)

1. [Problema abierto: diseña una solución original fundamentada en el curso]

**SECCIÓN C — Diseño e Integración** (40% de {questionCount} ítems, 400-600 palabras c/u)

1. [Reto de creación: construye, diseña o propone integrando al menos 3 conceptos del curso]

---

**CLAVE Y RÚBRICA POR SECCIÓN**

Sección A: A1=[a/b/c/d], A2=…
Sección B — Rúbrica (25 pts): Originalidad (8) + Fundamentación (8) + Viabilidad (6) + Claridad (3)
Sección C — Rúbrica (30 pts): Integración de contenidos (10) + Diseño coherente (10) + Innovación (7) + Presentación (3)`,
  },

  'case-study': {
    introductory: `Genera un examen de caso práctico INTRODUCTORIO para el curso "{courseTitle}".

Contenidos evaluados:
{moduleList}

Especificaciones:
- 1 caso breve (150-200 palabras) + {questionCount} preguntas de análisis
- Nivel cognitivo: Comprender y Aplicar básico (Bloom niveles 2-3)
- Situación cotidiana accesible relacionada con el tema
- Tiempo estimado: {timeLimit} minutos
${_FMT_RULE}

Estructura del documento:

**SECCIÓN A — Lectura del Caso**

**A1.** Titulo del caso: …
**A2.** Descripción del escenario (150-200 palabras): …

**SECCIÓN B — Preguntas de Análisis** ({questionCount} preguntas)

**B1.** Identifica qué conceptos del curso aparecen en el caso.
**B2.** Describe cómo se aplica [concepto clave] en el escenario.
**B3.** [Pregunta de comprensión adicional]

(continuar hasta {questionCount} preguntas)

---

**SECCIÓN C — Guía de Respuestas Esperadas**

B1: …
B2: …`,

    intermediate: `Genera un examen de caso práctico INTERMEDIO para el curso "{courseTitle}".

Contenidos evaluados:
{moduleList}

Especificaciones:
- 1 caso realista (300-400 palabras) con múltiples factores + {questionCount} preguntas analíticas
- Nivel cognitivo: Aplicar y Analizar (Bloom niveles 3-4)
- Tiempo estimado: {timeLimit} minutos
${_FMT_RULE}

Estructura del documento:

**SECCIÓN A — Caso: [Título]**

**A1.** Contexto: …
**A2.** Datos relevantes: …
**A3.** Situación actual o problema: …

**SECCIÓN B — Preguntas de Análisis** ({questionCount} preguntas)

**B1.** [Pregunta de identificación de causas o factores]
**B2.** [Pregunta de aplicación de concepto del curso]
**B3.** [Pregunta de análisis de consecuencias]

(continuar hasta {questionCount} preguntas)

---

**SECCIÓN C — Rúbrica** (por pregunta, 10 pts)

| Criterio | Pts | Descripción |
|----------|-----|-------------|
| Identificación correcta | 3 | … |
| Aplicación del concepto | 4 | … |
| Argumentación | 3 | … |`,

    advanced: `Genera un examen de caso AVANZADO para el curso "{courseTitle}".

Contenidos evaluados:
{moduleList}

Especificaciones:
- 1 caso complejo (500-600 palabras) con dilema o decisión crítica
- {questionCount} preguntas de evaluación y toma de decisiones
- Nivel cognitivo: Evaluar (Bloom nivel 5)
- Tiempo estimado: {timeLimit} minutos
${_FMT_RULE}

Estructura del documento:

**SECCIÓN A — Caso: [Título]**

**A1.** Contexto y antecedentes: …
**A2.** Complicación o dilema: …
**A3.** Datos ambiguos o contradictorios disponibles: …

**SECCIÓN B — Preguntas de Evaluación** ({questionCount} preguntas)

**B1.** Evalúa las dos alternativas principales. ¿Cuál recomendarías y por qué?
**B2.** [Pregunta de juicio crítico sobre una decisión del caso]
**B3.** [Pregunta de prospectiva: ¿qué pasaría si…?]

(continuar hasta {questionCount} preguntas)

---

**SECCIÓN C — Rúbrica Avanzada** (por pregunta, 20 pts)

| Criterio | Pts | Descripción |
|----------|-----|-------------|
| Evaluación de alternativas | 7 | … |
| Postura justificada | 6 | … |
| Uso de evidencia del curso | 5 | … |
| Coherencia del argumento | 2 | … |`,

    expert: `Genera un examen de caso EXPERTO para el curso "{courseTitle}".

Contenidos evaluados:
{moduleList}

Especificaciones:
- 1 mega-caso (700-900 palabras) con problema abierto e información incompleta
- {questionCount} preguntas de síntesis, diseño y propuesta
- Nivel cognitivo: Crear (Bloom nivel 6)
- Tiempo estimado: {timeLimit} minutos
${_FMT_RULE}

Estructura del documento:

**SECCIÓN A — Caso: [Título]**

**A1.** Escenario de alta complejidad (700-900 palabras): …
**A2.** Restricciones explícitas del contexto: …
**A3.** Información intencionalmente incompleta que el alumno debe gestionar: …

**SECCIÓN B — Preguntas de Creación** ({questionCount} preguntas)

**B1.** Propón una solución original al problema central. Justifica con teoría del curso.
**B2.** Diseña un plan de implementación detallado con fases y criterios de éxito.
**B3.** Anticipa 2 obstáculos y explica cómo los superarías.

(continuar hasta {questionCount} preguntas)

---

**SECCIÓN C — Rúbrica de Creación** (por pregunta, 30 pts)

| Criterio | Pts | Descripción |
|----------|-----|-------------|
| Originalidad de la propuesta | 10 | … |
| Integración de contenidos del curso | 8 | … |
| Viabilidad y coherencia | 7 | … |
| Manejo de información incompleta | 5 | … |`,
  },

  'oral': {
    introductory: `Genera una guía de evaluación oral INTRODUCTORIA para el curso "{courseTitle}".

Contenidos evaluados:
{moduleList}

Especificaciones:
- {questionCount} preguntas de entrevista oral sobre conceptos fundamentales
- Nivel cognitivo: Recordar y Comprender (Bloom niveles 1-2)
- Tiempo por estudiante: {timeLimit} minutos
${_FMT_RULE}

Estructura del documento:

**SECCIÓN A — Preguntas Principales** ({questionCount} preguntas)

**A1.** [Pregunta directa sobre concepto clave]
Respuesta esperada: mencionar [X, Y, Z]. Puntaje: [N] pts.

**A2.** …

(continuar hasta {questionCount} preguntas)

**SECCIÓN B — Preguntas de Seguimiento** (1 por cada pregunta de A)

**B1.** [Profundización o ejemplo relacionado con A1]
**B2.** …

---

**SECCIÓN C — Hoja de Puntuación**

| Pregunta | Criterio | Pts posibles | Pts obtenidos |
|----------|----------|-------------|---------------|
| A1 | Precisión conceptual | … | |
| A1 | Vocabulario técnico | … | |
| A2 | … | … | |`,

    intermediate: `Genera una guía de evaluación oral INTERMEDIA para el curso "{courseTitle}".

Contenidos evaluados:
{moduleList}

Especificaciones:
- {questionCount} preguntas de entrevista + 2 preguntas de seguimiento por tema
- Nivel cognitivo: Aplicar y Analizar (Bloom niveles 3-4)
- Tiempo por estudiante: {timeLimit} minutos
${_FMT_RULE}

Estructura del documento:

**SECCIÓN A — Preguntas de Aplicación** ({questionCount} preguntas)

**A1.** [Pregunta de aplicación a caso real: "Describe cómo aplicarías X en una situación Y"]
Respuesta esperada: …   Puntaje: … pts.

**A2.** …

**SECCIÓN B — Preguntas de Profundización** (2 por pregunta de A)

**B1a.** [Seguimiento de A1: ¿Por qué elegirías ese enfoque?]
**B1b.** [Alternativa: ¿Cómo cambiaría si el contexto fuera Z?]
**B2a.** …

---

**SECCIÓN C — Rúbrica Analítica**

| Pregunta | Pts | Criterio de excelencia |
|----------|-----|------------------------|
| A1 | … | Aplica el concepto con precisión a un contexto real |
| A2 | … | … |`,

    advanced: `Genera una guía de evaluación oral AVANZADA para el curso "{courseTitle}".

Contenidos evaluados:
{moduleList}

Especificaciones:
- {questionCount} preguntas de debate y evaluación crítica
- Nivel cognitivo: Evaluar (Bloom nivel 5)
- Tiempo por estudiante: {timeLimit} minutos
${_FMT_RULE}

Estructura del documento:

**SECCIÓN A — Afirmaciones para Debate** ({questionCount} ítems)

**A1.** [Afirmación controversial relacionada con el curso]. El evaluador presenta la postura; el alumno debe argumentar a favor o en contra.
Puntos a evaluar: coherencia, uso de evidencia, capacidad de refutación.

**A2.** …

**SECCIÓN B — Preguntas de Profundización** (2 por afirmación)

**B1a.** [¿Puedes citar un ejemplo del curso que respalde tu postura?]
**B1b.** [¿Cómo responderías a quien dice lo contrario?]

---

**SECCIÓN C — Rúbrica de Argumentación**

| Criterio | Excelente (4) | Bueno (3) | Regular (2) | Insuficiente (1) |
|----------|--------------|-----------|-------------|-----------------|
| Claridad de postura | … | … | … | … |
| Calidad de argumentos | … | … | … | … |
| Manejo de objeciones | … | … | … | … |
| Fluidez y precisión | … | … | … | … |`,

    expert: `Genera una guía de evaluación oral EXPERTA para el curso "{courseTitle}".

Contenidos evaluados:
{moduleList}

Especificaciones:
- {questionCount} preguntas de defensa de propuesta original
- Nivel cognitivo: Crear (Bloom nivel 6)
- Tiempo por estudiante: {timeLimit} minutos
- El alumno presenta una propuesta; el evaluador la desafía con objeciones
${_FMT_RULE}

Estructura del documento:

**SECCIÓN A — Presentación Inicial del Alumno** (apertura de ~3 min)

**A1.** El alumno expone su propuesta original sobre [tema del curso].
Evaluador escucha y toma notas sobre: originalidad, fundamentación, claridad.

**SECCIÓN B — Preguntas de Desafío del Evaluador** ({questionCount} preguntas)

**B1.** [Objeción técnica: "¿Cómo resolvería tu propuesta el problema de X?"]
**B2.** [Objeción de viabilidad: "¿Qué pasaría si el recurso Y no estuviera disponible?"]
**B3.** [Integración: "¿Cómo conecta tu propuesta con [concepto Z del curso]?"]

(continuar hasta {questionCount} preguntas)

---

**SECCIÓN C — Rúbrica de Defensa Oral**

| Criterio | Pts | Descripción |
|----------|-----|-------------|
| Calidad de la propuesta original | 30 | … |
| Fundamentación teórica en defensa | 25 | … |
| Manejo de objeciones | 25 | … |
| Claridad y fluidez oral | 20 | … |`,
  },
};

// ── Label maps ──────────────────────────────────────────────────────────────
const EXAM_TYPE_LABELS = {
  'multiple-choice': '📋 Opción múltiple',
  'essay':           '✍️ Ensayo',
  'project':         '🛠 Proyecto',
  'mixed':           '🔀 Mixto',
  'case-study':      '📂 Caso práctico',
  'oral':            '🎙 Oral / entrevista',
};

const DIFFICULTY_LABELS = {
  introductory: '🌱 Introductorio (Bloom 1-2: Recordar / Comprender)',
  intermediate: '📈 Intermedio (Bloom 3-4: Aplicar / Analizar)',
  advanced:     '🔬 Avanzado (Bloom 5: Evaluar)',
  expert:       '🚀 Experto (Bloom 6: Crear)',
};

// ── Helper: build type + difficulty rows ─────────────────────────────────────
function _examTypeRows(cfg = {}) {
  const typeOpts = Object.entries(EXAM_TYPE_LABELS)
    .map(([v, l]) => `<option value="${v}" ${cfg.examType === v ? 'selected' : ''}>${l}</option>`)
    .join('');
  const diffOpts = Object.entries(DIFFICULTY_LABELS)
    .map(([v, l]) => `<option value="${v}" ${cfg.difficulty === v ? 'selected' : ''}>${l}</option>`)
    .join('');
  return `
    <div class="row-2">
      <div class="fg">
        <label>Tipo de examen</label>
        <select id="ex-type">${typeOpts}</select>
      </div>
      <div class="fg">
        <label>Dificultad</label>
        <select id="ex-diff">${diffOpts}</select>
      </div>
    </div>`;
}

// ── Main Exams object ────────────────────────────────────────────────────────
const Exams = {
  // ── Form HTML for creating a new exam module ──
  newFormHTML() {
    const cap  = State.capabilities?.ai || {};
    const prov = State.settings?.aiProvider || 'manual';
    return `
      <div class="fg">
        <label>Prompt / tema del examen</label>
        <textarea id="ex-prompt" class="code" rows="5" placeholder="Selecciona tipo y dificultad, luego usa los botones para generar el prompt, o escríbelo manualmente."></textarea>
        <div style="margin-top:6px;display:flex;gap:8px;flex-wrap:wrap">
          <button type="button" class="btn btn-outline btn-sm" id="ex-gen-week">⚡ Semana actual</button>
          <button type="button" class="btn btn-outline btn-sm" id="ex-gen-month">📅 Este mes</button>
          <button type="button" class="btn btn-outline btn-sm" id="ex-gen-all">📚 Curso completo</button>
        </div>
      </div>
      ${_examTypeRows({ examType: 'mixed', difficulty: 'intermediate' })}
      <div class="row-2">
        <div class="fg"><label># preguntas</label><input type="number" id="ex-qcount" value="10" min="1" max="50"></div>
        <div class="fg"><label>Tiempo (min)</label><input type="number" id="ex-time" value="30" min="5" max="240"></div>
      </div>
      <div class="row-2">
        <div class="fg">
          <label>Proveedor IA</label>
          <select id="ex-prov">
            <option value="manual" ${prov==='manual'?'selected':''}>Manual (yo lo pego)</option>
            <option value="openai" ${prov==='openai'?'selected':''} ${!cap.openai?'disabled':''}>OpenAI ${!cap.openai?'(no configurado)':'✓'}</option>
            <option value="anthropic" ${prov==='anthropic'?'selected':''} ${!cap.anthropic?'disabled':''}>Anthropic Claude ${!cap.anthropic?'(no configurado)':'✓'}</option>
          </select>
        </div>
        <div class="fg"><label>Modelo (opcional)</label><input id="ex-model" placeholder="ej. gpt-4o-mini, claude-haiku-4-5"></div>
      </div>
      <p class="hint">El examen queda <strong>bloqueado</strong> hasta la fecha del módulo.</p>`;
  },

  wirePromptGenButtons(weekNum) {
    const week = weekNum !== undefined ? weekNum : 0;
    const fillPrompt = async (scope) => {
      if (!State.cur) return;
      try {
        toast('⏳ Generando prompt…', 3000);
        const { prompt } = await API.getExamPrompt(State.cur._id, scope, week);
        this.applyPromptTemplate(prompt);
        toast('✅ Prompt generado');
      } catch (err) { toast('❌ ' + err.message); }
    };
    $('ex-gen-week')?.addEventListener('click',  () => fillPrompt('week'));
    $('ex-gen-month')?.addEventListener('click', () => fillPrompt('month'));
    $('ex-gen-all')?.addEventListener('click',   () => fillPrompt('all'));
  },

  // Combines the fetched course content with the selected type+difficulty template
  applyPromptTemplate(moduleList) {
    const el = $('ex-prompt');
    if (!el) return;
    const type       = $val('ex-type') || 'mixed';
    const difficulty = $val('ex-diff') || 'intermediate';
    const qcount     = $val('ex-qcount') || '10';
    const time       = $val('ex-time') || '30';
    const title      = State.cur?.title || 'este curso';

    const tmpl = (EXAM_TEMPLATES[type] || {})[difficulty];
    if (!tmpl) { el.value = moduleList; return; }

    el.value = tmpl
      .replace(/\{courseTitle\}/g, title)
      .replace(/\{moduleList\}/g, moduleList)
      .replace(/\{questionCount\}/g, qcount)
      .replace(/\{timeLimit\}/g, time);
    el.dispatchEvent(new Event('input'));
  },

  readNewForm() {
    return {
      prompt:        $val('ex-prompt'),
      examType:      $val('ex-type')   || 'mixed',
      difficulty:    $val('ex-diff')   || 'intermediate',
      questionCount: parseInt($val('ex-qcount')) || 10,
      timeLimit:     parseInt($val('ex-time'))   || 30,
      provider:      $val('ex-prov'),
      model:         $val('ex-model'),
      preGenerated:  false,
      locked:        true,
    };
  },

  // ── Form HTML for editing an existing exam module ──
  editFormHTML(m) {
    const cfg = m.examConfig || {};
    const cap = State.capabilities?.ai || {};
    return `
      <div class="fg">
        <label>Prompt</label>
        <textarea id="ex-prompt" class="code" rows="5">${escapeHTML(cfg.prompt || '')}</textarea>
        <div style="margin-top:6px;display:flex;gap:8px;flex-wrap:wrap">
          <button type="button" class="btn btn-outline btn-sm" id="ex-gen-week">⚡ Semana actual</button>
          <button type="button" class="btn btn-outline btn-sm" id="ex-gen-month">📅 Este mes</button>
          <button type="button" class="btn btn-outline btn-sm" id="ex-gen-all">📚 Curso completo</button>
        </div>
      </div>
      ${_examTypeRows(cfg)}
      <div class="row-2">
        <div class="fg"><label># preguntas</label><input type="number" id="ex-qcount" value="${cfg.questionCount||10}" min="1" max="50"></div>
        <div class="fg"><label>Tiempo (min)</label><input type="number" id="ex-time" value="${cfg.timeLimit||30}" min="5" max="240"></div>
      </div>
      <div class="row-2">
        <div class="fg">
          <label>Proveedor IA</label>
          <select id="ex-prov">
            <option value="manual" ${cfg.provider==='manual'?'selected':''}>Manual</option>
            <option value="openai" ${cfg.provider==='openai'?'selected':''} ${!cap.openai?'disabled':''}>OpenAI ${!cap.openai?'(no config)':'✓'}</option>
            <option value="anthropic" ${cfg.provider==='anthropic'?'selected':''} ${!cap.anthropic?'disabled':''}>Anthropic ${!cap.anthropic?'(no config)':'✓'}</option>
          </select>
        </div>
        <div class="fg"><label>Modelo</label><input id="ex-model" value="${cfg.model||''}"></div>
      </div>
      <p class="hint">Si cambias el prompt y guardas, el examen anterior queda inválido. Genera de nuevo.</p>`;
  },

  readEditForm() { return this.readNewForm(); },

  // Lift #modal-root above the player overlay so exam modals
  // (autograding, paste, final-exam) are visible & interactive.
  // Restores prior z-index when the modal is closed.
  _lift() {
    const root = document.getElementById('modal-root');
    if (!root) return;
    const prevZ        = root.style.zIndex;
    const prevPos      = root.style.position;
    const prevPointer  = root.style.pointerEvents;
    root.style.position     = 'fixed';
    root.style.inset        = '0';
    root.style.zIndex       = '999999';
    root.style.pointerEvents = 'auto';

    // Watch for the modal element being removed → restore.
    const observer = new MutationObserver(() => {
      if (!root.firstElementChild) {
        root.style.zIndex       = prevZ;
        root.style.position     = prevPos;
        root.style.pointerEvents = prevPointer;
        root.style.removeProperty('inset');
        observer.disconnect();
      }
    });
    observer.observe(root, { childList: true });
  },

  // ── Final exam synthesis modal ─────────────────
  showFinalExamModal() {
    if (!State.cur) return;
    showModal('🏁 Examen Final', `
      <p class="hint" style="margin-bottom:12px">El prompt se construye automáticamente a partir de todos los módulos, secciones del sílabo y exámenes previos.</p>
      <div class="fg"><label>Prompt generado</label><textarea id="final-prompt" class="code" rows="10" placeholder="Cargando…"></textarea></div>
      <p class="hint">Copia este prompt y pégalo en tu IA favorita, luego importa el resultado como módulo Examen IA.</p>
    `, async () => {
      const prompt = $val('final-prompt');
      if (!prompt.trim()) { toast('El prompt está vacío'); return false; }
      await navigator.clipboard?.writeText(prompt);
      toast('📋 Prompt copiado al portapapeles');
    }, { saveText: '📋 Copiar prompt', wide: true });
    this._lift();

    API.getFinalExamPrompt(State.cur._id).then(({ prompt }) => {
      const el = $('final-prompt');
      if (el) el.value = prompt;
    }).catch(err => toast('❌ ' + err.message));
  },

  // ── Render exam in player ──────────────────────
  async openInPlayer(module, embedEl) {
    const data        = await API.getExam(module._id);
    const exam        = data.exam;
    const reachedDate = data.reachedDate;
    const moduleDate  = new Date(data.moduleDate);

    if (!exam) {
      this._stopExternalTimer();
      embedEl.innerHTML = this.lockedCardHTML(module, moduleDate, reachedDate, false);
      this.wireLockedActions(module);
      return;
    }
    if (!exam.visible) {
      this._stopExternalTimer();
      embedEl.innerHTML = this.lockedCardHTML(module, moduleDate, reachedDate, true);
      this.wireLockedActions(module);
      return;
    }
    this.renderExam(module, exam, embedEl);
  },

  // ── External floating timer ────────────────────
  // Starts counting from the moment the exam was unlocked/saved.
  // Persists across re-renders of the same exam. Auto-removes when
  // the exam container leaves the DOM (player closed / module switched).
  _startExternalTimer(exam, cfg) {
    this._stopExternalTimer();
    const startTime = new Date(exam.unlockedAt || exam.generatedAt || Date.now()).getTime();
    const limitMs   = (cfg.timeLimit || 30) * 60 * 1000;
    const taken     = !!exam.takenAt;

    const el = document.createElement('div');
    el.id = 'exam-external-timer';
    el.style.cssText = [
      'position:fixed','bottom:24px','right:24px','z-index:9998',
      'background:var(--surface,#fffdf7)','border:2px solid var(--gold,#d4a017)',
      'border-radius:14px','padding:10px 18px','min-width:140px',
      'box-shadow:0 8px 32px rgba(42,32,21,.22)',
      'font-family:\'Space Mono\',monospace',
      'display:flex','flex-direction:column','align-items:center','gap:2px',
      'transition:border-color .2s,background .2s',
    ].join(';');
    el.innerHTML = `
      <div style="font-size:10px;color:var(--text2,#6b5c40);text-transform:uppercase;letter-spacing:1.5px">
        ${taken ? 'Tiempo final' : 'Tiempo transcurrido'}
      </div>
      <div id="ext-timer-display" style="font-size:22px;font-weight:bold;color:var(--text,#2a2015);line-height:1">--:--</div>
      <div id="ext-timer-sub" style="font-size:10px;color:var(--text2,#6b5c40)">de ${cfg.timeLimit||30} min</div>
    `;
    document.body.appendChild(el);

    const tick = () => {
      const container = document.querySelector('.pl-exam-container');
      if (!container || !document.getElementById('exam-external-timer')) {
        this._stopExternalTimer();
        return;
      }
      const elapsedMs = Date.now() - startTime;
      const totalSec  = Math.max(0, Math.floor(elapsedMs / 1000));
      const hh = Math.floor(totalSec / 3600);
      const mm = Math.floor((totalSec % 3600) / 60);
      const ss = totalSec % 60;
      const pad = n => String(n).padStart(2, '0');
      const disp = hh > 0 ? `${hh}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`;

      const dEl = document.getElementById('ext-timer-display');
      const sEl = document.getElementById('ext-timer-sub');
      if (!dEl || !sEl) { this._stopExternalTimer(); return; }
      dEl.textContent = disp;

      if (taken) {
        sEl.textContent = `de ${cfg.timeLimit||30} min · ✓ entregado`;
        el.style.borderColor = 'var(--acc2,#4a7c59)';
        dEl.style.color      = 'var(--acc2,#4a7c59)';
        return;
      }

      const remaining = limitMs - elapsedMs;
      if (remaining > 0) {
        const remMin = Math.ceil(remaining / 60000);
        sEl.textContent = `quedan ~${remMin} min`;
        const lowFrac = remaining / limitMs;
        if (lowFrac < 0.15) {
          el.style.borderColor = 'var(--danger,#b42828)';
          dEl.style.color      = 'var(--danger,#b42828)';
        } else if (lowFrac < 0.35) {
          el.style.borderColor = 'var(--acc,#c8622a)';
          dEl.style.color      = 'var(--acc,#c8622a)';
        } else {
          el.style.borderColor = 'var(--gold,#d4a017)';
          dEl.style.color      = 'var(--text,#2a2015)';
        }
      } else {
        const overMin = Math.floor(-remaining / 60000);
        sEl.textContent = `+${overMin} min sobre tiempo`;
        el.style.borderColor = 'var(--danger,#b42828)';
        dEl.style.color      = 'var(--danger,#b42828)';
      }
    };
    tick();
    this._timerInterval = setInterval(tick, 1000);
  },

  _stopExternalTimer() {
    if (this._timerInterval) {
      clearInterval(this._timerInterval);
      this._timerInterval = null;
    }
    document.getElementById('exam-external-timer')?.remove();
  },

  lockedCardHTML(m, moduleDate, reachedDate, hasContent) {
    const cfg       = m.examConfig || {};
    const fechaStr  = moduleDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    const provLabel = { openai: 'OpenAI', anthropic: 'Anthropic Claude', manual: 'Manual' }[cfg.provider || 'manual'];
    const typeLabel = EXAM_TYPE_LABELS[cfg.examType] || '🔀 Mixto';
    const diffLabel = DIFFICULTY_LABELS[cfg.difficulty] || '📈 Intermedio';
    return `<div class="pl-exam-container">
      <div class="exam-locked-card">
        <div class="lock-icon">${hasContent ? '🔒' : '📝'}</div>
        <h2>${escapeHTML(m.title)}</h2>
        <p>${typeLabel} · ${diffLabel}</p>
        <p>${cfg.questionCount||10} preguntas · ${cfg.timeLimit||30} min · ${provLabel}</p>
        <p style="margin:18px 0;color:#9b8e70">${hasContent
          ? `Examen pre-generado. Bloqueado hasta el <strong style="color:var(--gold)">${fechaStr}</strong>.`
          : `Aún no hay examen generado. ${cfg.provider !== 'manual' ? 'Genera uno o' : 'Pega uno externamente, o'} desbloquea.`}</p>
        <div class="exam-actions">
          ${cfg.provider !== 'manual' ? '<button class="btn btn-primary" id="ex-generate">⚡ Generar ahora</button>' : ''}
          ${cfg.provider === 'manual' ? '<button class="btn btn-primary" id="ex-paste">📋 Pegar examen externo</button>' : ''}
          <button class="btn btn-outline" id="ex-unlock">${reachedDate ? '👁 Ver examen' : '🔓 Desbloquear igualmente'}</button>
          ${cfg.provider !== 'manual' ? '<button class="btn btn-outline" id="ex-copy-prompt">📋 Copiar prompt</button>' : ''}
        </div>
      </div>
    </div>`;
  },

  wireLockedActions(m) {
    const cfg = m.examConfig || {};

    $('ex-generate')?.addEventListener('click', async () => {
      try {
        toast('⏳ Generando con IA…', 8000);
        await API.generateExam(m._id);
        toast('✅ Examen generado');
        Player.buildEmbed(m);
      } catch (err) { toast('❌ ' + err.message); }
    });

    $('ex-unlock')?.addEventListener('click', async () => {
      try {
        await API.unlockExam(m._id);
        m.examConfig.locked = false;
        toast('🔓 Desbloqueado');
        Player.buildEmbed(m);
      } catch (err) { toast('❌ ' + err.message); }
    });

    $('ex-copy-prompt')?.addEventListener('click', () => {
      navigator.clipboard?.writeText(this._buildPromptText(cfg))
        .then(() => toast('📋 Prompt copiado'));
    });

    $('ex-paste')?.addEventListener('click', () => this.showPasteModal(m));
  },

  // Strips markdown italic markers (* and _) from exam content while preserving bold.
  _stripItalics(md) {
    const store = [];
    let i = 0;
    // Protect bold+italic (***x*** / ___x___) → convert to bold, store as placeholder.
    // Protect bold (**x** / __x__) → store as placeholder.
    const shielded = md.replace(/(\*{2,3}|_{2,3})([^\n]+?)\1/g, (match, delim, inner) => {
      const clean = delim.length === 3
        ? `**${inner}**`   // bold+italic → bold only
        : match;           // bold → unchanged
      const key = `\x02${i++}\x03`;
      store.push([key, clean]);
      return key;
    });
    // Strip remaining single * and _ (italic markers).
    const stripped = shielded
      .replace(/\*([^*\n]+?)\*/g, '$1')
      .replace(/(?<![a-zA-Z0-9])_([^_\n]+?)_(?![a-zA-Z0-9])/g, '$1');
    // Restore protected bold sequences.
    return store.reduce((acc, [key, val]) => acc.replace(key, val), stripped);
  },

  // Builds the full templated prompt from an examConfig (type+difficulty+course content).
  _buildPromptText(cfg) {
    const type       = cfg.examType || 'mixed';
    const difficulty = cfg.difficulty || 'intermediate';
    const tmpl = (EXAM_TEMPLATES[type] || {})[difficulty];
    if (tmpl) {
      return tmpl
        .replace(/\{courseTitle\}/g, State.cur?.title || 'este curso')
        .replace(/\{moduleList\}/g, cfg.prompt || '')
        .replace(/\{questionCount\}/g, cfg.questionCount || 10)
        .replace(/\{timeLimit\}/g, cfg.timeLimit || 30);
    }
    return `Genera un examen sobre el siguiente tema:\n\n${cfg.prompt || ''}\n\n- ${cfg.questionCount||10} preguntas · ${cfg.timeLimit||30} min`;
  },

  showPasteModal(m) {
    const cfg = m.examConfig || {};
    const hasPrompt = !!(cfg.prompt && cfg.prompt.trim());
    showModal('📋 Pegar examen externo', `
      ${hasPrompt ? `
        <div class="fg" style="background:#f7f3eb;border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:14px">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px">
            <label style="margin:0"><strong>Prompt definido para este examen</strong></label>
            <button type="button" class="btn btn-primary btn-sm" id="paste-copy-prompt">📋 Copiar prompt</button>
          </div>
          <textarea readonly class="code" rows="5"
            style="width:100%;font-family:monospace;padding:8px;box-sizing:border-box;background:#fffdf7;border:1px solid var(--border);border-radius:6px"
          >${escapeHTML(this._buildPromptText(cfg))}</textarea>
          <p class="hint" style="margin-top:6px;margin-bottom:0">Cópialo, pégalo en tu IA favorita, y trae el resultado al área de abajo.</p>
        </div>
      ` : ''}
      <div class="fg">
        <label>Resultado del examen (Markdown)</label>
        <textarea id="paste-content" class="code" rows="16"
          style="width:100%;min-height:320px;resize:vertical;font-family:monospace;padding:10px;box-sizing:border-box"
          placeholder="# Examen 1&#10;&#10;## Pregunta 1&#10;…&#10;&#10;---&#10;## Clave de respuestas&#10;1. …"></textarea>
      </div>
      <p class="hint" style="margin-top:8px">Tip: pulsa Ctrl/Cmd+V dentro del área de texto.</p>
    `, async () => {
      const content = $val('paste-content');
      if (!content.trim()) { toast('Vacío'); return false; }
      await API.pasteExam(m._id, content);
      toast('✅ Examen guardado');
      Player.buildEmbed(m);
    }, { wide: true });
    this._lift();
    setTimeout(() => {
      document.getElementById('paste-content')?.focus();
      document.getElementById('paste-copy-prompt')?.addEventListener('click', () => {
        navigator.clipboard?.writeText(this._buildPromptText(cfg))
          .then(() => toast('📋 Prompt copiado'));
      });
    }, 50);
  },

  renderExam(m, exam, embedEl) {
    const cfg = m.examConfig || {};
    embedEl.innerHTML = `<div class="pl-exam-container">
      <div class="exam-meta">
        <span>${EXAM_TYPE_LABELS[cfg.examType] || '🔀 Mixto'}</span>
        <span><strong>${cfg.questionCount||10}</strong> preguntas</span>
        <span><strong>${cfg.timeLimit||30}</strong> min</span>
        ${exam.takenAt ? `<span>📊 <strong>${exam.score}/${exam.total}</strong> (${exam.total ? (exam.score/exam.total*100).toFixed(0) : 0}%)</span>` : ''}
        <span style="margin-left:auto">
          <button class="btn btn-primary btn-sm" id="ex-grade">${exam.takenAt ? 'Re-calificar' : 'Auto-calificar'}</button>
        </span>
      </div>
      <div class="md">${mdParse(this._stripItalics(exam.content))}</div>
    </div>`;

    $('ex-grade').addEventListener('click', () => this.showGradeModal(m, exam));
    this._startExternalTimer(exam, cfg);
  },

  showGradeModal(m, exam) {
    showModal('📊 Calificar examen', `
      <p class="hint">Compara tus respuestas con la clave del examen y registra tu puntaje.</p>
      <div class="row-2">
        <div class="fg"><label>Tu puntaje</label><input type="number" id="g-score" min="0" value="${exam.score ?? ''}" placeholder="ej. 85"></div>
        <div class="fg"><label>Total posible</label><input type="number" id="g-total" min="1" value="${exam.total ?? (m.examConfig?.questionCount||10)*10}"></div>
      </div>
      <div class="fg"><label>Notas / reflexión</label><textarea id="g-notes" rows="3" placeholder="¿Qué se te complicó? ¿Qué repasar?">${escapeHTML(exam.userNotes||'')}</textarea></div>
    `, async () => {
      const score = parseFloat($val('g-score'));
      const total = parseFloat($val('g-total'));
      if (isNaN(score) || isNaN(total) || total <= 0) { toast('Puntajes inválidos'); return false; }
      await API.gradeExam(m._id, score, total, $val('g-notes'));
      const m2 = State.curModules.find(x => x._id === m._id);
      if (m2) m2.done = true;
      State.curGrades = await API.getGrades(State.cur._id);
      toast(`✅ ${score}/${total} (${(score/total*100).toFixed(0)}%) registrado`);
      Player.buildEmbed(m);
    });
    this._lift();
  },

  init() { /* nothing static */ },
};
