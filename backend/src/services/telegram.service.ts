// In-memory storage for form data
const formDataStore = new Map<string, any>();

export class TelegramService {
    static storeFormData(chatId: string, formData: any): void {
        formDataStore.set(chatId, formData);
    }

    static getFormData(chatId: string): any {
        return formDataStore.get(chatId);
    }

    static deleteFormData(chatId: string): void {
        formDataStore.delete(chatId);
    }
} 