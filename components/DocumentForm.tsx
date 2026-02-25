"use client"

import * as React from "react"
import { useFormState } from '@/hooks/useFormState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PDFPreview } from './PDFPreview'
import { TemplateSelect } from './TemplateSelect'
import { toast } from '@/components/ui/toast-context'
import { api } from '@/lib/api'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface FormFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  type?: string
  placeholder?: string
  required?: boolean
  className?: string
  backendField?: string
}

const FormField = ({ id, label, value, onChange, error, type = 'text', placeholder, required, className, backendField }: FormFieldProps) => (
  <div className={`space-y-2 ${className}`}>
    <Label htmlFor={id} className="flex justify-between">
      <div>
        {label} {required && <span className="text-destructive">*</span>}
        {backendField && (
          <span className="block text-[10px] text-muted-foreground">
            Backend field: {backendField}
          </span>
        )}
      </div>
      {error && <span className="text-sm text-destructive">{error}</span>}
    </Label>
    <Input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={error ? 'border-destructive' : ''}
      required={required}
    />
  </div>
)

interface DocumentFormProps {
  initialData?: any;
  editingDocumentId?: number;
  onClose?: () => void;
  onSaved?: () => void;
}

const BODY_TYPES = [
  'Sedan 4DR',
  'SUV 4DR',
  'Coupe 2DR',
  'Cargo 3DR',
  'Extended Cab 2DR',
  'Regular Cab 2DR',
  'Semi-Trailer Truck 2DR'
] as const;

export function DocumentForm({ initialData, editingDocumentId, onClose, onSaved }: DocumentFormProps) {
  const formRef = React.useRef<HTMLFormElement>(null)
  const {
    formData,
    errors,
    isGenerating,
    handleInputChange,
    handleSubmit,
    setTemplate,
    loadDraft,
    setFormData,
  } = useFormState()

  const [drafts, setDrafts] = React.useState<any[]>([])
  const [isLoadingDrafts, setIsLoadingDrafts] = React.useState(false)
  const [showDraftsDialog, setShowDraftsDialog] = React.useState(false)

  // Load initial data if provided
  React.useEffect(() => {
    if (initialData) {
      setFormData(initialData)
    }
  }, [initialData, setFormData])

  // Fetch drafts
  const fetchDrafts = React.useCallback(async () => {
    setIsLoadingDrafts(true)
    try {
      const response = await api.getDrafts()
      setDrafts(response)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load drafts',
        variant: 'destructive',
      })
    } finally {
      setIsLoadingDrafts(false)
    }
  }, [])

  // Load drafts when dialog opens
  React.useEffect(() => {
    if (showDraftsDialog) {
      fetchDrafts()
    }
  }, [showDraftsDialog, fetchDrafts])

  const handleLoadDraft = async (draftId: number) => {
    try {
      const draft = await api.getDraft(draftId)
      await loadDraft(draft)
      setShowDraftsDialog(false)
      toast({
        title: 'Success',
        description: 'Draft loaded successfully',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load draft',
        variant: 'destructive',
      })
    }
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formRef.current) return

    try {
      const formDataToSend = {
        ...formData,
        documentName: formData.documentName || `${formData.first || 'Unnamed'} ${formData.last || 'Document'}`,
        timestamp: new Date().toISOString()
      }

      if (editingDocumentId) {
        await api.updateDocument(editingDocumentId, {
          name: formDataToSend.documentName,
          data: formDataToSend,
        })
        toast({
          title: 'Document updated',
          description: 'Saving changes and generating PDF.',
        })
      }

      const blob = await api.generatePDF(formDataToSend)
      
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${formData.documentName || 'document'}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)

      toast({
        title: 'Success',
        description: editingDocumentId ? 'Document updated and PDF generated.' : 'PDF generated successfully',
      })

      onSaved?.()
      onClose?.()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate PDF',
        variant: 'destructive',
      })
    }
  }

  React.useEffect(() => {
    // Check for stored form data
    const storedData = localStorage.getItem('pdfFormData');
    if (storedData) {
      const parsedData = JSON.parse(storedData);
      // Update form fields with stored data
      setFormData(prevData => ({
        ...prevData,
        ...parsedData
      }));
      // Clear stored data after using it
      localStorage.removeItem('pdfFormData');
    }
  }, []);

  return (
    <div className="grid grid-cols-2 gap-6">
      <form ref={formRef} onSubmit={handleFormSubmit} className="space-y-6">
        <div className="flex justify-between items-center mb-6">
          <TemplateSelect
            onSelect={setTemplate}
            selectedId={formData.templateId}
          />
          <Dialog open={showDraftsDialog} onOpenChange={setShowDraftsDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">Load Draft</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Load Draft</DialogTitle>
                <DialogDescription>
                  Select a previously saved draft to continue editing.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {isLoadingDrafts ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : drafts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    No drafts found
                  </p>
                ) : (
                  drafts.map((draft) => (
                    <div
                      key={draft.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer"
                      onClick={() => handleLoadDraft(draft.id)}
                    >
                      <div>
                        <h4 className="font-medium">{draft.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Created: {new Date(draft.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm">
                        Load
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <FormField
          id="documentName"
          label="Document Name"
          value={formData.documentName}
          onChange={(value) => handleInputChange('documentName', value)}
          error={errors.documentName}
          placeholder="Enter document name"
          backendField="documentName"
          className="col-span-2"
        />

        <Tabs defaultValue="vehicle1">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="vehicle1">Vehicle 1</TabsTrigger>
            <TabsTrigger value="vehicle2">Vehicle 2</TabsTrigger>
            <TabsTrigger value="owner">Owner</TabsTrigger>
            <TabsTrigger value="additional">Additional</TabsTrigger>
          </TabsList>

          <TabsContent value="vehicle1" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                id="vehiclename"
                label="Vehicle Name"
                value={formData.vehiclename}
                onChange={(value) => handleInputChange('vehiclename', value)}
                error={errors.vehiclename}
                placeholder="Enter vehicle name"
                backendField="vehiclename"
                className="col-span-2"
              />
              <FormField
                id="plate1"
                label="License Plate"
                value={formData.plate1}
                onChange={(value) => {
                  handleInputChange('plate1', value);
                  handleInputChange('plate2', value);
                  handleInputChange('plate3', value);
                }}
                error={errors.plate1}
                placeholder="Enter plate number"
                backendField="plate1"
                required
              />
              <FormField
                id="vin1"
                label="VIN"
                value={formData.vin1}
                onChange={(value) => handleInputChange('vin1', value)}
                error={errors.vin1}
                placeholder="Enter VIN"
                backendField="vin1"
                required
              />
              <FormField
                id="make1"
                label="Make"
                value={formData.make1}
                onChange={(value) => handleInputChange('make1', value)}
                error={errors.make1}
                placeholder="Enter make"
                backendField="make1"
                required
              />
              <FormField
                id="model1"
                label="Model"
                value={formData.model1}
                onChange={(value) => handleInputChange('model1', value)}
                error={errors.model1}
                placeholder="Enter model"
                backendField="model1"
                required
              />
              <FormField
                id="year"
                label="Year"
                value={formData.year}
                onChange={(value) => handleInputChange('year', value)}
                error={errors.year}
                placeholder="YYYY"
                backendField="year"
                required
              />
              <FormField
                id="color"
                label="Color"
                value={formData.color}
                onChange={(value) => handleInputChange('color', value)}
                error={errors.color}
                placeholder="Enter color"
                backendField="color"
              />
              <div className="space-y-2">
                <Label htmlFor="body" className="flex justify-between">
                  <div>
                    Body Type
                    <span className="block text-[10px] text-muted-foreground">
                      Backend field: body
                    </span>
                  </div>
                  {errors.body && <span className="text-sm text-destructive">{errors.body}</span>}
                </Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.body || ''}
                    onValueChange={(value) => handleInputChange('body', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select body type" />
                    </SelectTrigger>
                    <SelectContent>
                      {BODY_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">Custom...</SelectItem>
                    </SelectContent>
                  </Select>
                  {formData.body === 'custom' && (
                    <Input
                      id="body-custom"
                      value={formData.bodyCustom || ''}
                      onChange={(e) => {
                        handleInputChange('bodyCustom', e.target.value);
                        handleInputChange('body', e.target.value);
                      }}
                      placeholder="Enter custom body type"
                      className={errors.body ? 'border-destructive' : ''}
                    />
                  )}
                </div>
              </div>
              <FormField
                id="car"
                label="Car Number"
                value={formData.car}
                onChange={(value) => handleInputChange('car', value)}
                error={errors.car}
                placeholder="Enter car number"
                backendField="car"
              />
            </div>
          </TabsContent>

          <TabsContent value="vehicle2" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                id="plate2"
                label="License Plate 2"
                value={formData.plate2}
                onChange={(value) => handleInputChange('plate2', value)}
                error={errors.plate2}
                placeholder="Enter plate number"
                backendField="plate2"
              />
              <FormField
                id="vin2"
                label="VIN 2"
                value={formData.vin2}
                onChange={(value) => handleInputChange('vin2', value)}
                error={errors.vin2}
                placeholder="Enter VIN"
                backendField="vin2"
              />
              <FormField
                id="make2"
                label="Make 2"
                value={formData.make2}
                onChange={(value) => handleInputChange('make2', value)}
                error={errors.make2}
                placeholder="Enter make"
                backendField="make2"
              />
              <FormField
                id="model2"
                label="Model 2"
                value={formData.model2}
                onChange={(value) => handleInputChange('model2', value)}
                error={errors.model2}
                placeholder="Enter model"
                backendField="model2"
              />
              <FormField
                id="plate3"
                label="License Plate 3"
                value={formData.plate3}
                onChange={(value) => handleInputChange('plate3', value)}
                error={errors.plate3}
                placeholder="Enter plate number"
                backendField="plate3"
              />
              <FormField
                id="vin3"
                label="VIN 3"
                value={formData.vin3}
                onChange={(value) => handleInputChange('vin3', value)}
                error={errors.vin3}
                placeholder="Enter VIN"
                backendField="vin3"
              />
            </div>
          </TabsContent>

          <TabsContent value="owner" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                id="first"
                label="First Name"
                value={formData.first}
                onChange={(value) => handleInputChange('first', value)}
                error={errors.first}
                placeholder="Enter first name"
                backendField="first"
                required
              />
              <FormField
                id="last"
                label="Last Name"
                value={formData.last}
                onChange={(value) => handleInputChange('last', value)}
                error={errors.last}
                placeholder="Enter last name"
                backendField="last"
                required
              />
              <FormField
                id="address"
                label="Address"
                value={formData.address}
                onChange={(value) => handleInputChange('address', value)}
                error={errors.address}
                placeholder="Enter address"
                backendField="address"
                required
                className="col-span-2"
              />
              <FormField
                id="city"
                label="City"
                value={formData.city}
                onChange={(value) => handleInputChange('city', value)}
                error={errors.city}
                placeholder="Enter city"
                backendField="city"
                required
              />
              <FormField
                id="state"
                label="State"
                value={formData.state}
                onChange={(value) => handleInputChange('state', value)}
                error={errors.state}
                placeholder="Enter state"
                backendField="state"
                required
              />
              <FormField
                id="zip"
                label="ZIP Code"
                value={formData.zip}
                onChange={(value) => handleInputChange('zip', value)}
                error={errors.zip}
                placeholder="Enter ZIP code"
                backendField="zip"
                required
              />
            </div>
          </TabsContent>

          <TabsContent value="additional" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                id="ins"
                label="Insurance Company"
                value={formData.ins}
                onChange={(value) => handleInputChange('ins', value)}
                error={errors.ins}
                placeholder="Enter insurance company"
                backendField="ins"
              />
              <FormField
                id="policy"
                label="Policy Number"
                value={formData.policy}
                onChange={(value) => handleInputChange('policy', value)}
                error={errors.policy}
                placeholder="Enter policy number"
                backendField="policy"
              />
              <FormField
                id="date1"
                label="Date 1"
                value={formData.date1}
                onChange={(value) => handleInputChange('date1', value)}
                error={errors.date1}
                type="date"
                backendField="date1"
              />
              <FormField
                id="date2"
                label="Date 2"
                value={formData.date2}
                onChange={(value) => handleInputChange('date2', value)}
                error={errors.date2}
                type="date"
                backendField="date2"
              />
              <FormField
                id="exp1"
                label="Expiration 1"
                value={formData.exp1}
                onChange={(value) => handleInputChange('exp1', value)}
                error={errors.exp1}
                type="date"
                backendField="exp1"
              />
              <FormField
                id="exp2"
                label="Expiration 2"
                value={formData.exp2}
                onChange={(value) => handleInputChange('exp2', value)}
                error={errors.exp2}
                type="date"
                backendField="exp2"
              />
              <FormField
                id="exp3"
                label="Expiration 3"
                value={formData.exp3}
                onChange={(value) => handleInputChange('exp3', value)}
                error={errors.exp3}
                type="date"
                backendField="exp3"
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSubmit(true)}
            disabled={isGenerating}
          >
            Save as Draft
          </Button>
          <Button
            type="submit"
            disabled={isGenerating}
          >
            {isGenerating ? 'Generating...' : 'Generate PDF'}
          </Button>
        </div>
      </form>

      <div className="relative">
        <PDFPreview 
          data={formData} 
          templateId={formData.templateId}
          templatePath={formData.templatePath}
        />
      </div>
    </div>
  )
} 