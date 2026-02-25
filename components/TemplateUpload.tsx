"use client"

import { useState } from 'react'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { api } from '@/lib/api'
import { toast } from "@/components/ui/toast-context"

interface TemplateUploadProps {
  onUploadSuccess?: () => void
}

export function TemplateUpload({ onUploadSuccess }: TemplateUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file)
    } else {
      toast({
        title: 'Invalid File',
        description: 'Please select a PDF file',
        variant: 'destructive',
      })
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !templateName) {
      toast({
        title: 'Missing Information',
        description: 'Please provide a template name and select a file',
        variant: 'destructive',
      })
      return
    }

    setIsUploading(true)
    try {
      await api.uploadTemplate(selectedFile, templateName, templateDescription)
      
      toast({
        title: 'Success',
        description: 'Template uploaded successfully',
      })
      
      // Reset form
      setSelectedFile(null)
      setTemplateName('')
      setTemplateDescription('')
      
      // Notify parent component
      onUploadSuccess?.()
    } catch (error) {
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Failed to upload template',
        variant: 'destructive',
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Upload className="mr-2 h-4 w-4" />
          Upload Template
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload PDF Template</DialogTitle>
          <DialogDescription>
            Upload a PDF file with form fields to use as a template.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="templateName">Template Name</Label>
            <Input
              id="templateName"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Enter template name"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="templateDescription">Description (Optional)</Label>
            <Input
              id="templateDescription"
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              placeholder="Enter template description"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="templateFile">PDF File</Label>
            <Input
              id="templateFile"
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
            />
            <p className="text-sm text-muted-foreground">
              Select a PDF file with form fields
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleUpload}
            disabled={isUploading || !selectedFile}
          >
            {isUploading ? 'Uploading...' : 'Upload Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 