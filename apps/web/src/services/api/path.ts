export const ApiPath = {
  health: '/api/health',
  sessions: '/api/sessions',
  session: (id: string) => `/api/sessions/${encodeURIComponent(id)}`,
  text: (id: string) => `/api/sessions/${encodeURIComponent(id)}/turns/text`,
  audio: (id: string) => `/api/sessions/${encodeURIComponent(id)}/turns/audio`,
  socket: (id: string) => `/ws/sessions/${encodeURIComponent(id)}`,
};
