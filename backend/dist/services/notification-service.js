import EventEmitter from 'events';
class NotificationService extends EventEmitter {
    constructor() {
        super();
    }
    emit(event, data) {
        return super.emit(event, data);
    }
    on(event, listener) {
        return super.on(event, listener);
    }
}
const notificationService = new NotificationService();
export default notificationService;
