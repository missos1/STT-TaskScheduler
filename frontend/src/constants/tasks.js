// TaskItem.priority values from the API contract, with Vietnamese labels.
export const PRIORITY_LABELS = {
  high: 'Ưu tiên cao',
  medium: 'Ưu tiên vừa',
  low: 'Ưu tiên thấp',
}
 
// Where confirmed tasks can be pushed (POST /tasks/confirm -> "targets").
export const SYNC_TARGETS = [
  { id: 'google_calendar', label: 'Google Calendar' },
  { id: 'notion', label: 'Notion' },
  { id: 'jira', label: 'Jira' },
  { id: 'trello', label: 'Trello' },
]
