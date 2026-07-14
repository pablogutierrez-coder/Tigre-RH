export const FDR_COLLECTIONS = {
  users: 'users',
  campaigns: 'campaigns',
  sessions: 'sessions',
  participants: 'participants',
  attendance: 'attendance',
  confirmations: 'confirmations',
  reopens: 'reopens',
  logs: 'logs',
  surveys: 'surveys',
  responses: 'responses',
  fileRecords: 'file_records',
  trainingClosures: 'training_closures',
  appSettings: 'app_settings',
  selectionRequisitions: 'selection_requisitions',
  selectionApplicants: 'selection_applicants',
  selectionAudit: 'selection_audit',
  selectionNotifications: 'selection_notifications',
} as const;

export type FdrCollectionName =
  (typeof FDR_COLLECTIONS)[keyof typeof FDR_COLLECTIONS];
