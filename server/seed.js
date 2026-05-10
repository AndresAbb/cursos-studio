require('dotenv').config();
const mongoose = require('mongoose');
const { Course, Module, ExternalCourse, Settings } = require('./models');

const URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cursos_studio';

async function seed() {
  await mongoose.connect(URI);
  console.log('Conectado. Limpiando datos existentes...');
  await Course.deleteMany({});
  await Module.deleteMany({});
  await ExternalCourse.deleteMany({});

  // Curso normal
  const course = await Course.create({
    title: 'Diseño UX — Nivel Inicial',
    emoji: '🎨',
    color: '#c8622a',
    description: 'Curso de muestra con videos, sitios, texto guía y un examen IA.',
    background: { type: 'color', value: '#f5f0e8' },
  });

  await Module.insertMany([
    // Semana 1
    { courseId: course._id, title: 'Bienvenida al curso', type: 'text', textContent: '# Bienvenida\n\nEsta semana arrancamos con los **fundamentos de UX**.\n\n## Plan\n\n- Lunes: video de UX Research\n- Miércoles: Design Thinking\n- Viernes: Heurísticas de Nielsen', week: 0, dayOfWeek: 0, order: 0 },
    { courseId: course._id, title: 'Fundamentos de UX Research', type: 'youtube',
      url: 'https://www.youtube.com/watch?v=t0aCoqXKFOU', week: 0, dayOfWeek: 0, order: 1 },
    { courseId: course._id, title: 'Design Thinking en 10 minutos', type: 'youtube',
      url: 'https://www.youtube.com/watch?v=_r0VX-aU_T8', week: 0, dayOfWeek: 2, order: 0 },
    { courseId: course._id, title: '10 Heurísticas de Usabilidad', type: 'web-link',
      url: 'https://www.nngroup.com/articles/ten-usability-heuristics/',
      domain: 'nngroup.com',
      favicon: 'https://www.google.com/s2/favicons?domain=nngroup.com&sz=64',
      week: 0, dayOfWeek: 4, order: 0 },

    // Semana 2
    { courseId: course._id, title: 'Prototipado en Figma', type: 'youtube',
      url: 'https://www.youtube.com/watch?v=FTFaQWZBqQ8', week: 1, dayOfWeek: 1, order: 0 },
    { courseId: course._id, title: 'Material Design Guidelines', type: 'web',
      url: 'https://m3.material.io/foundations', week: 1, dayOfWeek: 3, order: 0 },
    { courseId: course._id, title: 'Examen 1: Fundamentos UX', type: 'ai-exam',
      week: 1, dayOfWeek: 4, order: 1,
      examConfig: {
        prompt: 'Examen sobre los fundamentos de UX: investigación de usuarios, design thinking, y las 10 heurísticas de Jakob Nielsen. Mezcla preguntas de opción múltiple con respuesta corta.',
        questionCount: 8,
        timeLimit: 30,
        provider: 'manual',
        locked: true,
        preGenerated: false,
      } },
  ]);

  // Curso externo de muestra
  await ExternalCourse.create({
    title: 'Cálculo I — Universidad',
    emoji: '📐',
    color: '#5b4a8a',
    url: 'https://classroom.google.com',
    domain: 'classroom.google.com',
    favicon: 'https://www.google.com/s2/favicons?domain=classroom.google.com&sz=64',
    daysOfWeek: [0, 2, 4],   // Lun, Mié, Vie
    timeOfDay: '09:00',
    notes: 'Clase presencial + tareas en Classroom',
  });

  await Settings.findByIdAndUpdate('global', {}, { upsert: true, new: true });

  console.log('✅ Seed completo: 1 curso (con módulos text, youtube, web-link, web, ai-exam) + 1 externo.');
  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
