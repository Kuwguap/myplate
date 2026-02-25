type NotificationType = 'success' | 'error' | 'info'

interface NotificationEvent extends CustomEvent<{
  title: string
  message: string
  type: NotificationType
}> {
  type: 'app-notification'
}

export const NotificationService = {
  dispatch(title: string, message: string, type: NotificationType = 'info') {
    const event = new CustomEvent('app-notification', {
      detail: { title, message, type }
    }) as NotificationEvent

    window.dispatchEvent(event)
  },

  // Activity logging methods
  logDocumentActivity(action: string, documentName: string) {
    this.dispatch(
      'Document Activity',
      `${action}: ${documentName}`,
      'info'
    )
  },

  logTemplateActivity(action: string, templateName: string) {
    this.dispatch(
      'Template Activity',
      `${action}: ${templateName}`,
      'info'
    )
  },

  logUserActivity(action: string) {
    this.dispatch(
      'User Activity',
      action,
      'info'
    )
  },

  logError(error: Error | string) {
    const message = error instanceof Error ? error.message : error
    this.dispatch(
      'Error',
      message,
      'error'
    )
  }
} 