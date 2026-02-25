import { render, screen, fireEvent, waitFor } from '@/lib/test-utils'
import { DocumentForm } from '@/components/DocumentForm'
import { api } from '@/lib/api'
import { toast } from '@/components/ui/toast-context'

// Mock dependencies
jest.mock('@/lib/api', () => ({
  generatePDF: jest.fn(),
  previewPDF: jest.fn(),
  createDocument: jest.fn(),
}))

jest.mock('@/components/ui/toast-context', () => ({
  toast: jest.fn(),
  ToastContainer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

describe('DocumentForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('validates required fields', async () => {
    render(<DocumentForm />)

    // Try to submit empty form
    const submitButton = screen.getByText('Generate PDF')
    fireEvent.click(submitButton)

    // Check for validation messages
    await waitFor(() => {
      expect(screen.getByText('VIN must be 17 characters')).toBeInTheDocument()
      expect(screen.getByText('License plate is required')).toBeInTheDocument()
      expect(screen.getByText('Make is required')).toBeInTheDocument()
      expect(screen.getByText('Model is required')).toBeInTheDocument()
    })
  })

  it('sends correct data to backend', async () => {
    const mockGeneratePDF = api.generatePDF as jest.Mock
    mockGeneratePDF.mockResolvedValue(new Blob())

    render(<DocumentForm />)

    // Fill form fields
    fireEvent.change(screen.getByLabelText('VIN'), {
      target: { value: '1HGCM82633A123456' }
    })
    fireEvent.change(screen.getByLabelText('License Plate'), {
      target: { value: 'ABC123' }
    })
    fireEvent.change(screen.getByLabelText('Make'), {
      target: { value: 'Honda' }
    })
    fireEvent.change(screen.getByLabelText('Model'), {
      target: { value: 'Civic' }
    })

    // Submit form
    const submitButton = screen.getByText('Generate PDF')
    fireEvent.click(submitButton)

    // Verify API call
    await waitFor(() => {
      expect(mockGeneratePDF).toHaveBeenCalledWith({
        vin1: '1HGCM82633A123456',
        plate1: 'ABC123',
        make1: 'Honda',
        model1: 'Civic',
        documentName: expect.any(String),
        timestamp: expect.any(String)
      })
    })

    // Verify success toast
    expect(toast).toHaveBeenCalledWith({
      title: 'Success',
      description: 'PDF generated successfully'
    })
  })

  it('handles API errors', async () => {
    const mockGeneratePDF = api.generatePDF as jest.Mock
    mockGeneratePDF.mockRejectedValue(new Error('API Error'))

    render(<DocumentForm />)

    // Fill required fields
    fireEvent.change(screen.getByLabelText('VIN'), {
      target: { value: '1HGCM82633A123456' }
    })
    fireEvent.change(screen.getByLabelText('License Plate'), {
      target: { value: 'ABC123' }
    })
    fireEvent.change(screen.getByLabelText('Make'), {
      target: { value: 'Honda' }
    })
    fireEvent.change(screen.getByLabelText('Model'), {
      target: { value: 'Civic' }
    })

    // Submit form
    const submitButton = screen.getByText('Generate PDF')
    fireEvent.click(submitButton)

    // Verify error toast
    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'API Error',
        variant: 'destructive'
      })
    })
  })
}) 