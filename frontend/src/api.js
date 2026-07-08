const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

async function request(path, { method = 'GET', body, token } = {}) {
  const isFormData = body instanceof FormData;
  const headers = {};
  if (!isFormData) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Erreur ${res.status}`);
  }
  return data;
}

export const api = {
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  me: (token) => request('/auth/me', { token }),
  updateProfile: (payload, token) => request('/auth/profile', { method:'PATCH', body:payload, token }),
  changeEmail: (payload, token) => request('/auth/email', { method:'PATCH', body:payload, token }),
  changePassword: (payload, token) => request('/auth/password', { method:'PATCH', body:payload, token }),
  uploadAvatar: (file, token) => { const form=new FormData(); form.append('avatar',file); return request('/auth/avatar',{method:'POST',body:form,token}); },
  deleteAvatar: (token) => request('/auth/avatar',{method:'DELETE',token}),

  searchTutors: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
    ).toString();
    return request(`/tutors${qs ? `?${qs}` : ''}`);
  },
  getTutor: (id) => request(`/tutors/${id}`),
  updateTutor: (id, payload, token) => request(`/tutors/${id}`, { method: 'PUT', body: payload, token }),
  addAvailability: (id, payload, token) =>
    request(`/tutors/${id}/availability`, { method: 'POST', body: payload, token }),

  getSubjects: () => request('/subjects'),
  getCourses: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
    ).toString();
    return request(`/content/courses${qs ? `?${qs}` : ''}`);
  },
  getCourse: (id) => request(`/content/courses/${id}`),
  getCourseLearning: (id, token) => request(`/content/courses/${id}/learning`, { token }),
  getPublicMaterials: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
    ).toString();
    return request(`/content/materials${qs ? `?${qs}` : ''}`);
  },
  getTutorials: () => request('/content/tutorials'),
  getTutorial: (id) => request(`/content/tutorials/${id}`),

  createBooking: (payload, token) => request('/bookings', { method: 'POST', body: payload, token }),
  myBookings: (token) => request('/bookings/me', { token }),
  getBooking: (id, token) => request(`/bookings/${id}`, { token }),
  cancelBooking: (id, token) => request(`/bookings/${id}/cancel`, { method: 'PATCH', token }),

  addReview: (payload, token) => request('/reviews', { method: 'POST', body: payload, token }),

  getMaterials: (bookingId, token) => request(`/materials/booking/${bookingId}`, { token }),
  addMaterial: (payload, token) => request('/materials', { method: 'POST', body: payload, token }),
  deleteMaterial: (id, token) => request(`/materials/${id}`, { method: 'DELETE', token }),

  getContacts: (token) => request('/messages/contacts', { token }),
  getThread: (userId, token) => request(`/messages/thread/${userId}`, { token }),
  markThreadRead: (userId, token) => request(`/messages/thread/${userId}/read`, { method: 'PATCH', token }),
  sendMessage: (payload, token) => request('/messages', { method: 'POST', body: payload, token }),
  sendMessageWithFile: ({ recipientId, content, file }, token) => {
    const form = new FormData();
    form.append('recipientId', recipientId);
    if (content) form.append('content', content);
    if (file) form.append('file', file);
    return request('/messages', { method:'POST', body:form, token });
  },
  getUnreadCount: (token) => request('/messages/unread-count', { token }),

  getCallIceConfig: (token) => request('/calls/ice-config', { token }),
  startCall: (payload, token) => request('/calls', { method:'POST', body:payload, token }),
  getIncomingCall: (token) => request('/calls/incoming', { token }),
  getCall: (id, token) => request(`/calls/${id}`, { token }),
  acceptCall: (id, token) => request(`/calls/${id}/accept`, { method:'POST', token }),
  rejectCall: (id, token) => request(`/calls/${id}/reject`, { method:'POST', token }),
  endCall: (id, token) => request(`/calls/${id}/end`, { method:'POST', token }),
  sendCallSignal: (id, type, payload, token) => request(`/calls/${id}/signals`, { method:'POST', body:{ type, payload }, token }),
  getCallSignals: (id, after, token) => request(`/calls/${id}/signals?after=${after || 0}`, { token }),

  searchUsers: (q, token) => request(`/messages/users${q ? `?q=${encodeURIComponent(q)}` : ''}`, { token }),
  getForumCategories: () => request('/content/forum/categories'),
  getForumTopics: (params = {}) => { const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))).toString(); return request(`/content/forum/topics${qs ? `?${qs}` : ''}`); },
  getForumTopic: (id) => request(`/content/forum/topics/${id}`),
  createForumTopic: (payload, token) => request('/content/forum/topics', { method:'POST', body:payload, token }),
  createForumPost: (topicId, payload, token) => request(`/content/forum/topics/${topicId}/posts`, { method:'POST', body:payload, token }),
  getBootcamps: (params = {}) => { const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))).toString(); return request(`/content/bootcamps${qs ? `?${qs}` : ''}`); },
  registerBootcamp: (id, token) => request(`/content/bootcamps/${id}/register`, { method:'POST', token }),
  getPersonalPrograms: (params = {}) => { const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))).toString(); return request(`/content/personal-programs${qs ? `?${qs}` : ''}`); },
  getPersonalProgram: (id) => request(`/content/personal-programs/${id}`),
  startPersonalProgram: (id, token) => request(`/content/personal-programs/${id}/start`, { method:'POST', token }),
  getPersonalProgramProgress: (id, token) => request(`/content/personal-programs/${id}/my-progress`, { token }),
  togglePersonalTask: (id, token) => request(`/content/personal-tasks/${id}/toggle`, { method:'POST', token }),
  getPersonalDashboard: (token) => request('/content/personal-dashboard', { token }),
  getHabits: (token) => request('/content/habits', { token }),
  createHabit: (payload, token) => request('/content/habits', { method:'POST', body:payload, token }),
  updateHabit: (id, payload, token) => request(`/content/habits/${id}`, { method:'PATCH', body:payload, token }),
  toggleHabitToday: (id, token) => request(`/content/habits/${id}/toggle-today`, { method:'POST', token }),
  getBooks: (params = {}) => { const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))).toString(); return request(`/content/books${qs ? `?${qs}` : ''}`); },
  getBook: (id) => request(`/content/books/${id}`),
  getBookProgress: (id, token) => request(`/content/books/${id}/my-progress`, { token }),
  toggleBookBookmark: (id, payload, token) => request(`/content/books/${id}/bookmarks`, { method:'POST', body:payload, token }),
  addBookNote: (id, payload, token) => request(`/content/books/${id}/notes`, { method:'POST', body:payload, token }),
  saveBookProgress: (id, payload, token) => request(`/content/books/${id}/progress`, { method:'POST', body:payload, token }),
  enrollCourse: (id, token) => request(`/content/courses/${id}/enroll`, { method:'POST', token }),
  saveLessonProgress: (id, payload, token) => request(`/content/lessons/${id}/progress`, { method:'POST', body:payload, token }),
  saveLessonNote: (id, content, token) => request(`/content/lessons/${id}/notes`, { method:'POST', body:{ content }, token }),
  createCourseCertificate: (id, token) => request(`/content/courses/${id}/certificate`, { method:'POST', token }),
  getCourseCertificate: (id, token) => request(`/content/courses/${id}/certificate`, { token }),
  getMyLearning: (token) => request('/content/my/learning', { token }),
  getEntrepreneurTools: (params = {}) => { const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))).toString(); return request(`/content/entrepreneur-tools${qs ? `?${qs}` : ''}`); },
  getMyEntrepreneurProject: (token) => request('/content/entrepreneur-projects/me', { token }),
  updateEntrepreneurTask: (id, status, token) => request(`/content/entrepreneur-tasks/${id}`, { method:'PATCH', body:{status}, token }),
  getCareerDashboard: (token) => request('/content/career/dashboard', { token }),
  saveCareerPractice: (payload, token) => request('/content/career/practice', { method:'POST', body:payload, token }),
  saveCareerGoals: (payload, token) => request('/content/career/goals', { method:'POST', body:payload, token }),
  uploadCareerCv: ({file,title}, token) => { const form=new FormData(); form.append('file',file); form.append('title',title||file.name); return request('/content/career/cv',{method:'POST',body:form,token}); },
  getDashboardCounts: (token) => request('/content/dashboard-counts', { token }),
  getNotifications: (token) => request('/content/notifications', { token }),
  markNotificationsReadByType: (type, token) => request(`/content/notifications/read-by-type/${encodeURIComponent(type)}`, { method:'PATCH', token }),
  markNotificationRead: (id, token) => request(`/content/notifications/${id}/read`, { method:'PATCH', token }),

  getStudySpaceDashboard: (token) => request('/content/study-space/dashboard', { token }),
  getStudySpaceStats: (token) => request('/content/study-space/stats', { token }),
  createStudyTask: (payload, token) => request('/content/study-space/tasks', { method:'POST', body:payload, token }),
  updateStudyTask: (id, payload, token) => request(`/content/study-space/tasks/${id}`, { method:'PATCH', body:payload, token }),
  deleteStudyTask: (id, token) => request(`/content/study-space/tasks/${id}`, { method:'DELETE', token }),
  createStudyEvent: (payload, token) => request('/content/study-space/events', { method:'POST', body:payload, token }),
  updateStudyEvent: (id, payload, token) => request(`/content/study-space/events/${id}`, { method:'PATCH', body:payload, token }),
  deleteStudyEvent: (id, token) => request(`/content/study-space/events/${id}`, { method:'DELETE', token }),
  startFocusSession: (payload, token) => request('/content/study-space/focus', { method:'POST', body:payload, token }),
  updateFocusSession: (id, payload, token) => request(`/content/study-space/focus/${id}`, { method:'PATCH', body:payload, token }),
  addStudyDistraction: (payload, token) => request('/content/study-space/distractions', { method:'POST', body:payload, token }),
  resolveStudyDistraction: (id, resolved, token) => request(`/content/study-space/distractions/${id}`, { method:'PATCH', body:{resolved}, token }),
  createStudyNote: (payload, token) => request('/content/study-space/notes', { method:'POST', body:payload, token }),
  updateStudyNote: (id, payload, token) => request(`/content/study-space/notes/${id}`, { method:'PATCH', body:payload, token }),
  deleteStudyNote: (id, token) => request(`/content/study-space/notes/${id}`, { method:'DELETE', token }),
  createStudyGoal: (payload, token) => request('/content/study-space/goals', { method:'POST', body:payload, token }),
  updateStudyGoal: (id, payload, token) => request(`/content/study-space/goals/${id}`, { method:'PATCH', body:payload, token }),
  toggleStudyMilestone: (id, token) => request(`/content/study-space/milestones/${id}/toggle`, { method:'POST', token }),

  adminDashboard: (token) => request('/admin/dashboard', { token }),
  adminSeedPythonCourse: (token) => request('/admin/seed/python-course', { method:'POST', token }),
  adminSeedFullCatalogue: (token) => request('/admin/seed/full-catalogue', { method:'POST', token }),
  adminSeedPersonalDevelopment: (token) => request('/admin/seed/personal-development', { method:'POST', token }),
  adminCategories: (token, universe='') => request(`/admin/categories${universe ? `?universe=${encodeURIComponent(universe)}` : ''}`, { token }),
  adminUsers: (token) => request('/admin/users', { token }),
  adminSetUserRole: (id, role, token) => request(`/admin/users/${id}/role`, { method:'PATCH', body:{role}, token }),
  adminList: (resource, token) => request(`/admin/${resource}`, { token }),
  adminCreate: (resource, payload, token) => request(`/admin/${resource}`, { method:'POST', body:payload, token }),
  adminUpdateCourse: (id, payload, token) => request(`/admin/courses/${id}`, { method:'PUT', body:payload, token }),
  adminSetCourseStatus: (id, status, token) => request(`/admin/courses/${id}/status`, { method:'PATCH', body:{status}, token }),
  adminDelete: (resource, id, token) => request(`/admin/${resource}/${id}`, { method:'DELETE', token }),
  adminCourseStructure: (id, token) => request(`/admin/courses/${id}/structure`, { token }),
  adminAddModule: (courseId, payload, token) => request(`/admin/courses/${courseId}/modules`, { method:'POST', body:payload, token }),
  adminDeleteModule: (id, token) => request(`/admin/modules/${id}`, { method:'DELETE', token }),
  adminAddLesson: (moduleId, payload, token) => request(`/admin/modules/${moduleId}/lessons`, { method:'POST', body:payload, token }),
  adminDeleteLesson: (id, token) => request(`/admin/lessons/${id}`, { method:'DELETE', token }),
  adminAddTutorialStep: (id, payload, token) => request(`/admin/tutorials/${id}/steps`, { method:'POST', body:payload, token }),
  adminAddProgramDay: (id, payload, token) => request(`/admin/personal-programs/${id}/days`, { method:'POST', body:payload, token }),
  adminUpload: (kind, file, token) => { const form = new FormData(); form.append('file', file); return request(`/admin/uploads/${kind}`, { method:'POST', body:form, token }); },
  adminAddCourseFile: (courseId, payload, token) => request(`/admin/courses/${courseId}/files`, { method:'POST', body:payload, token }),
  adminCourseFiles: (courseId, token) => request(`/admin/courses/${courseId}/files`, { token }),
  adminDeleteCourseFile: (id, token) => request(`/admin/course-files/${id}`, { method:'DELETE', token }),
};
