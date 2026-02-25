// In-memory storage for form data
const formDataStore = new Map();
export class TelegramService {
    static storeFormData(chatId, formData) {
        formDataStore.set(chatId, formData);
    }
    static getFormData(chatId) {
        return formDataStore.get(chatId);
    }
    static deleteFormData(chatId) {
        formDataStore.delete(chatId);
    }
}
