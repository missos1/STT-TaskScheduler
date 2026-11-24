// Fake GET /api/rooms/{session_id}/summary response (status "ready").
export const MOCK_SUMMARY = {
  session_id: 'f89c1282-c45d-45b7-b3fe-1c098aa0f1c3',
  status: 'ready',
  meeting_time_iso: '2026-11-19T09:00:00+07:00',
  summary:
    'Nhóm chia việc cho phần đăng nhập của sprint 2: Hoàng làm giao diện, Đức làm API, Trung chuẩn bị dữ liệu giả. Việc chọn bản Whisper để buổi sau.',
  decisions: [
    'Bản tóm tắt chia ba phần: nội dung chính, quyết định, vấn đề còn mở',
    'Backend đăng nhập dùng FastAPI và JWT',
  ],
  tasks: [
    {
      id: 'task_01',
      task_description: 'Làm giao diện đăng nhập',
      assignee: 'Hoàng',
      due_date_iso: '2026-11-20T17:00:00+07:00',
      priority: 'high',
      status: 'draft',
    },
    {
      id: 'task_02',
      task_description: 'Viết API đăng nhập bằng FastAPI và JWT',
      assignee: 'Đức',
      due_date_iso: null, // nobody said a deadline
      priority: 'medium',
      status: 'draft',
    },
    {
      id: 'task_03',
      task_description: 'Tạo bộ dữ liệu giả cho task card',
      assignee: 'Trung',
      due_date_iso: '2026-11-25T00:00:00+07:00', // date only, no time
      priority: 'low',
      status: 'draft',
    },
    {
      id: 'task_04',
      task_description: 'Lưu nhiệm vụ vào SQLite',
      assignee: null, // LLM could not tell who
      due_date_iso: null,
      priority: 'medium',
      status: 'draft',
    },
  ],
}

// Same room while the LLM is still working (first response).
export const MOCK_SUMMARY_PROCESSING = {
  session_id: 'f89c1282-c45d-45b7-b3fe-1c098aa0f1c3',
  status: 'processing',
  summary: null,
  decisions: [],
  tasks: [],
}
