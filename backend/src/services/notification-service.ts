import EventEmitter from 'events'

class NotificationService extends EventEmitter {
  constructor() {
    super()
  }

  emit(event: string, data: any) {
    return super.emit(event, data)
  }

  on(event: string, listener: (...args: any[]) => void) {
    return super.on(event, listener)
  }
}

const notificationService = new NotificationService()
export default notificationService 