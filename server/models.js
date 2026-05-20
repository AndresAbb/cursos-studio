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
  favicon:     { type: String, default: '' },
  homepageUrl: { type: String, default: '' },
  startDate:   { type: Date, default: Date.now },
  background: {
    type:  { type: String, enum: ['color','image','preset'], default: 'color' },
    value: { type: String, default: '#f5f0e8' },
  },
  totalSeconds: { type: Number, default: 0 },
  status: { type: String, enum: ['active','finished','cancelled'], default: 'active', index: true },
  statusChangedAt: { type: Date, default: null },
  order: { type: Number, default: 0, index: true },
  grades: [{
    moduleId: { type: Schema.Types.ObjectId, ref: 'Module' },
    moduleTitle: String,
    score:    Number,
    total:    Number,
    date:     { type: Date, default: Date.now },
    notes:    String,
  }],
  syllabusLabels: [{
    startWeek:        { type: Number, default: 0 },
    endWeek:          { type: Number, default: 0 },
    title:            { type: String, default: '' },
    description:      { type: String, default: '' },
    examsheetContent: { type: String, default: '' },
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
  // Co-learning identity
  userId:      { type: String, default: '' },
  displayName: { type: String, default: 'Yo' },
  avatarEmoji: { type: String, default: '🎓' },
  // Public URL used in invite links (overrides auto-detected LAN IP)
  publicUrl:   { type: String, default: '' },
}, { timestamps: true });

// ─── FRIEND CONNECTION ───────────────────────────
const FriendSchema = new Schema({
  // Token created when the invite link is generated; used to accept
  inviteToken:  { type: String, default: '' },
  // Token the friend must include when pushing presence events to us
  pushToken:    { type: String, default: '' },
  // Friend's identity (filled on accept)
  friendId:     { type: String, default: '' },
  friendName:   { type: String, default: 'Amigo' },
  friendEmoji:  { type: String, default: '👤' },
  // Friend's app URL (optional — enables cross-instance event push)
  friendUrl:    { type: String, default: '' },
  status: { type: String, enum: ['pending', 'accepted', 'blocked'], default: 'pending' },
  // What WE share with this friend
  shareStudying:     { type: Boolean, default: true },
  shareProgress:     { type: Boolean, default: true },
  shareExamUpcoming: { type: Boolean, default: true },
  // How WE receive from this friend
  mutePresence: { type: Boolean, default: false },
  mutePokes:    { type: Boolean, default: false },
}, { timestamps: true });

// ─── GHOST COURSE ────────────────────────────────
// Lightweight "planned-but-not-yet-created" course shown on the home
// cronograma. Has no modules, no calendar, no exams — only intent.
// Lifecycle: planned → promoted (becomes a real Course) | discarded.
const GhostCourseSchema = new Schema({
  title:            { type: String, required: true },
  emoji:            { type: String, default: '🌱' },
  color:            { type: String, default: '#7a4a2a' },
  plannedStartDate: { type: Date,   default: Date.now },
  durationWeeks:    { type: Number, default: 4 },
  notes:            { type: String, default: '' },
  status:           { type: String, enum: ['planned','promoted','discarded'], default: 'planned', index: true },
  promotedCourseId: { type: Schema.Types.ObjectId, ref: 'Course', default: null },
  order:            { type: Number, default: 0, index: true },
}, { timestamps: true });

// ─── SKILL ───────────────────────────────────────
// 2D graph node. Connections are stored on each side as a denormalized
// list of peer skillIds + strength. UI keeps them in sync.
const SkillSchema = new Schema({
  name:       { type: String, required: true },
  color:      { type: String, default: '#7c5ce0' },
  emoji:      { type: String, default: '✦' },
  knownLevel: { type: Number, default: 0.5 },   // 0..1 → orb size
  axes: {
    careerValue:  { type: Number, default: 0.5 },
    personalPull: { type: Number, default: 0.5 },
    technical:    { type: Number, default: 0.5 },
    difficulty:   { type: Number, default: 0.5 },
  },
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  courseIds:         [{ type: Schema.Types.ObjectId, ref: 'Course' }],
  externalCourseIds: [{ type: Schema.Types.ObjectId, ref: 'ExternalCourse' }],
  connections: [{
    skillId:  { type: Schema.Types.ObjectId, ref: 'Skill' },
    strength: { type: Number, default: 0.5 },
  }],
}, { timestamps: true });

module.exports = {
  Course:  mongoose.model('Course', CourseSchema),
  Module:  mongoose.model('Module', ModuleSchema),
  Note:    mongoose.model('Note', NoteSchema),
  Sticker: mongoose.model('Sticker', StickerSchema),
  Exam:    mongoose.model('Exam', ExamSchema),
  ExternalCourse: mongoose.model('ExternalCourse', ExternalCourseSchema),
  Settings: mongoose.model('Settings', SettingsSchema),
  Friend:  mongoose.model('Friend', FriendSchema),
  Skill:   mongoose.model('Skill', SkillSchema),
  GhostCourse: mongoose.model('GhostCourse', GhostCourseSchema),
};
