export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api'

const checkServerConnection = async () => {
  try {
    const response = await fetch(`${API_URL}/health`)
    if (!response.ok) throw new Error('Server health check failed')
    return true
  } catch (error) {
    console.error('Server connection error:', error)
    throw new Error('Unable to connect to server. Please ensure the backend server is running.')
  }
}

export const api = {
  async checkConnection() {
    return checkServerConnection()
  },

  async uploadTemplate(file: File, name: string, description: string) {
    await checkServerConnection()
    const formData = new FormData()
    formData.append('template', file)
    formData.append('name', name)
    formData.append('description', description)

    const response = await fetch(`${API_URL}/templates`, {
      method: 'POST',
      body: formData,
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to upload template')
    }
    
    return response.json()
  },

  async getTemplates() {
    await checkServerConnection()
    const response = await fetch(`${API_URL}/templates`)
    if (!response.ok) {
      throw new Error('Failed to fetch templates')
    }
    return response.json()
  },

  async getTemplate(id: number) {
    const response = await fetch(`${API_URL}/templates/${id}`)
    if (!response.ok) {
      throw new Error('Failed to fetch template')
    }
    return response.json()
  },

  async deleteTemplate(id: number) {
    const response = await fetch(`${API_URL}/templates/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      throw new Error('Failed to delete template')
    }
  },

  async createDocument(data: any) {
    const response = await fetch(`${API_URL}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to create document')
    }
    return response.json()
  },

  async updateDocument(id: number, data: { name?: string; data?: Record<string, unknown>; status?: string }) {
    const response = await fetch(`${API_URL}/documents/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: data.name,
        data: data.data,
        status: data.status,
      }),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to update document')
    }
    return response.json()
  },

  async getDocuments() {
    await checkServerConnection()
    const response = await fetch(`${API_URL}/documents`)
    if (!response.ok) {
      throw new Error('Failed to fetch documents')
    }
    return response.json()
  },

  async generatePDF(data: any): Promise<Blob> {
    const response = await fetch(`${API_URL}/generate-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to generate PDF')
    }

    return response.blob()
  },

  async previewPDF(data: any): Promise<Blob> {
    const response = await fetch(`${API_URL}/preview-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to generate preview')
    }

    return response.blob()
  },

  async getDrafts() {
    const response = await fetch(`${API_URL}/drafts`)
    if (!response.ok) {
      throw new Error('Failed to fetch drafts')
    }
    return response.json()
  },

  async getDraft(id: number) {
    const response = await fetch(`${API_URL}/drafts/${id}`)
    if (!response.ok) {
      throw new Error('Failed to fetch draft')
    }
    return response.json()
  },

  async previewDocument(id: number): Promise<Blob> {
    const response = await fetch(`${API_URL}/documents/${id}/preview`, {
      method: 'GET',
    })

    if (!response.ok) {
      throw new Error('Failed to preview document')
    }

    return response.blob()
  },

  async downloadDocument(id: number): Promise<Blob> {
    const response = await fetch(`${API_URL}/documents/${id}/preview`, {
      method: 'GET',
    })

    if (!response.ok) {
      throw new Error('Failed to download document')
    }

    return response.blob()
  },

  async deleteDocument(id: number) {
    const response = await fetch(`${API_URL}/documents/${id}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to delete document')
    }
  }
} 