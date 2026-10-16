import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
export const chatSessions = sqliteTable('chat_sessions', {
  id: text('id').primaryKey(),
  tokenHash: text('token_hash').notNull(),
  nickname: text('nickname').notNull(),
  visitorName: text('visitor_name'),
  surface: text('surface').notNull(),
  startedAt: text('started_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  closedAt: text('closed_at'),
}, t => [index('chat_sessions_updated_idx').on(t.updatedAt, t.id)]);
export const chatTurns = sqliteTable('chat_turns', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => chatSessions.id),
  status: text('status').notNull(),
  startedAt: text('started_at').notNull(),
  finishedAt: text('finished_at'),
  responseJson: text('response_json'),
  responseStatus: integer('response_status'),
}, t => [index('chat_turns_session_idx').on(t.sessionId, t.startedAt)]);
export const chatMessages = sqliteTable('chat_messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: text('session_id').notNull().references(() => chatSessions.id),
  eventId: text('event_id').notNull(),
  role: text('role').notNull(),
  kind: text('kind').notNull(),
  content: text('content').notNull(),
  metadataJson: text('metadata_json'),
  createdAt: text('created_at').notNull(),
}, t => [index('chat_messages_session_idx').on(t.sessionId, t.id), uniqueIndex('chat_messages_event_idx').on(t.sessionId, t.eventId, t.kind)]);
export const chatSessionState = sqliteTable('chat_session_state', {
  sessionId: text('session_id').primaryKey().references(() => chatSessions.id),
  dataJson: text('data_json').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const demoBookings = sqliteTable('demo_bookings', {
  id: text('id').primaryKey(),
  requestId: text('request_id').notNull().unique(),
  sessionId: text('session_id').notNull().references(() => chatSessions.id),
  showId: text('show_id').notNull(),
  quantity: integer('quantity').notNull(),
  email: text('email').notNull(),
  receiptJson: text('receipt_json').notNull(),
  createdAt: text('created_at').notNull(),
}, t => [index('demo_bookings_session_idx').on(t.sessionId, t.createdAt)]);
