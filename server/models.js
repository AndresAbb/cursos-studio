const mongoose = require('mongoose');
const { Schema } = mongoose;

// ─── STICKER ─────────────────────────────────────
const StickerSchema = new Schema({
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  kind:     { type: String, enum: ['emoji','text','image'], required: true },
  category: { type: String, enum: ['fixed','globo','rueda','carta','candelabro'], default: 'fixed' },
  content:  { type: String, default: '' },
  textStyle:{ type: String, enum: ['plain','postit','border'], default: 'plain' },
  font:     { type: String, default: 'Caveat' },
  color:    { type: String, default: '#c8622a' },
  fontSize: { type: Number, default: 32 },
  x:        { type: Number, default: 100 },
  y:        { type: Number, default: 100 },
  rotation: { type: Number, default: 0 },
  scale:    { type: Number, default: 1 },
}, { timestamps: true });

// ─── MODULE ──────────────────────────────────────
// Tipos:
//   youtube, spotify, web   → embed
//   web-link                → no se puede embeber, solo link + favicon
//   text                    → instrucciones markdown
//   ai-exam                 → examen generado por IA
const ModuleSchema = new Schema({
  courseId:   { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  title:      { type: String, required: true },
  type:       { type: String, enum: ['youtube','spotify','web','web-link','text','ai-exam'], required: true },
  url:        { type: String, default: '' },
  // calendario
  week:       { type: Number, default: 0 },
  dayOfWeek:  { type: Number, default: 0 },
  order:      { type: Number, default: 0 },
  // estado
  done:       { type: Boolean, default: false },
  watchedSeconds: { type: Number, default: 0 },
  // metadatos
  description: { type: String, default: '' },
  thumbnail:   { type: String, default: '' },
  favicon:     { type: String, default: '' },
  domain:      { type: String, default: '' },
  importedFrom: { type: String, default: '' },
  // text module
  textContent: { type: String, default: '' },
  // AI exam config
  examConfig: {
    prompt:        { type: String, default: '' },
    examType:      { type: String, enum: ['multiple-choice','essay','project','mixed','case-study','oral'], default: 'mixed' },
    difficulty:    { type: String, enum: ['introductory','intermediate','advanced','expert'], default: 'intermediate' },
    questionCount: { type: Number, default: 10 },
    timeLimit:     { type: Number, default: 30 },
    provider:      { type: String, enum: ['openai','anthropic','manual'], default: 'manual' },
    model:         { type: String, default: '' },
    preGenerated:  { type: Boolean, default: false },
    locked:        { type: Boolean, default: true },
  },
}, { timestamps: true });

// ─── COURSE ──────────────────────────────────────
const CourseSchema = new Schema({
  title:       { type: String, required: true },
  emoji:       { type: String, default: '📚' },
  color:       { type: String, default: '#c8622a' },
  description: { type: String, default: '' },
  startDate:   { type: Date, default: Date.now },
  background: {
    type:  { type: String, enum: ['color','image','preset'], default: 'color' },
    value: { type: String, default: '#f5f0e8' },
  },
  totalSeconds: { type: Number, default: 0 },
  grades: [{
    moduleId: { type: Schema.Types.ObjectId, ref: 'Module' },
    moduleTitle: String,
    score:    Number,
    total:    Number,
    date:     { type: Date, default: Date.now },
    notes:    String,
  }],
  syllabusLabels: [{
    startWeek:   { type: Number, default: 0 },
    endWeek:     { type: Number, default: 0 },
    title:       { type: String, default: '' },
    description: { type: String, default: '' },
  }],
}, { timestamps: true });

// ─── NOTE ────────────────────────────────────────
const NoteSchema = new Schema({
  moduleId: { type: Schema.Types.ObjectId, ref: 'Module', required: true, unique: true, index: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  content:  { type: String, default: '' },
  obsidianPath: { type: String, default: '' },
}, { timestamps: true });

// ─── EXAM ────────────────────────────────────────
const ExamSchema = new Schema({
  moduleId:  { type: Schema.Types.ObjectId, ref: 'Module', required: true, index: true },
  courseId:  { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  content:   { type: String, default: '' },
  generatedAt: { type: Date, default: null },
  unlockedAt:  { type: Date, default: null },
  score:     { type: Number, default: null },
  total:     { type: Number, default: null },
  takenAt:   { type: Date, default: null },
  userNotes: { type: String, default: '' },
}, { timestamps: true });

// ─── EXTERNAL COURSE ─────────────────────────────
const ExternalCourseSchema = new Schema({
  title:     { type: String, required: true },
  emoji:     { type: String, default: '🌐' },
  color:     { type: String, default: '#5b4a8a' },
  url:       { type: String, required: true },
  favicon:   { type: String, default: '' },
  domain:    { type: String, default: '' },
  daysOfWeek:{ type: [Number], default: [] },
  timeOfDay: { type: String, default: '' },
  startDate: { type: Date, default: Date.now },
  endDate:   { type: Date, default: null },
  notes:     { type: String, default: '' },
}, { timestamps: true });

// ─── SETTINGS (singleton) ────────────────────────
const SettingsSchema = new Schema({
  _id: { type: String, default: 'global' },
  obsidianVaultPath: { type: String, default: '' },
  obsidianAutoSave:  { type: Boolean, default: false },
  aiProvider: { type: String, enum: ['openai','anthropic','none'], default: 'none' },
  aiModel:    { type: String, default: '' },
  aiKeyMasked:{ type: String, default: '' },
  spotifyConfigured: { type: Boolean, default: false },
  ytdlpAvailable: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = {
  Course:  mongoose.model('Course', CourseSchema),
  Module:  mongoose.model('Module', ModuleSchema),
  Note:    mongoose.model('Note', NoteSchema),
  Sticker: mongoose.model('Sticker', StickerSchema),
  Exam:    mongoose.model('Exam', ExamSchema),
  ExternalCourse: mongoose.model('ExternalCourse', ExternalCourseSchema),
  Settings: mongoose.model('Settings', SettingsSchema),
};
